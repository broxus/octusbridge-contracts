const fs = require('fs');
const BigNumber = require('bignumber.js');

require('dotenv').config({ path: './../env/freeton.env' });

const freeton = require('freeton-truffle');
const utils = require('freeton-truffle/utils');

const giverConfig = {
  address: process.env.GIVER_CONTRACT,
  abi: JSON.parse(process.env.GIVER_ABI),
};

const tonWrapper = new freeton.TonWrapper({
  network: process.env.NETWORK,
  seed: process.env.SEED,
  randomTruffleNonce: Boolean(process.env.RANDOM_TRUFFLE_NONCE),
  giverConfig,
});


class Migration {
  constructor(tonWrapper) {
    this.tonWrapper = tonWrapper;

    if (!fs.existsSync('migration-log.json')) {
      this._writeContent({});
    }
    
    this.history = [];
  }
  
  updateLog({ name, address }) {
    const migrationLog = JSON.parse(fs.readFileSync('migration-log.json', 'utf8'));
    
    const extendedLog = {
      ...migrationLog,
      [name]: address
    };
    
    this._writeContent(extendedLog);
  }
  
  _writeContent(content) {
    fs.writeFileSync('migration-log.json', JSON.stringify(content));
  }
  
  async getGiverBalance() {
    const [{ balance }] = await this.tonWrapper.ton.queries.accounts.query(
      {
        id: { eq: this.tonWrapper.giverConfig.address },
      },
      'balance',
    );
    
    return new BigNumber(balance);
  }
  
  async deploy(
    contractWrapper,
    constructorParams,
    initParams,
    initialBalance
  ) {
    console.log(`Deploying ${contractWrapper.name}...`);
    
    const beforeDeployGiverBalance = await this.getGiverBalance();
  
    const status = await contractWrapper.deploy(
      constructorParams,
      initParams,
      initialBalance
    );
    
    const afterDeployGiverBalance = await this.getGiverBalance();

    const deployCost = beforeDeployGiverBalance.minus(afterDeployGiverBalance);
    
    const historyAction = { contractWrapper, deployCost, status };
    
    this._logHistoryAction(historyAction);
    
    this.updateHistory(historyAction );
    
    this.updateLog(contractWrapper);
  }
  
  updateHistory(action) {
    this.history.push(action);
  }
  
  logHistory() {
    console.log(`==================================== Migrations ====================================`);
    this.history.map((action, i) => {
      console.log(`Action #${i}`);
      this._logHistoryAction(action);
    });
    
    const totalCost = this.history.reduce((acc, { deployCost }) => acc.plus(deployCost), new BigNumber(0));
    
    console.log(`Total cost: ${totalCost.dividedBy(10**9)}`);
    console.log('====================================================================================');
  }
  
  _logHistoryAction(action) {
    console.log(`Contract ${action.contractWrapper.name}`);
    console.log(`Address: ${action.contractWrapper.address}`);
    console.log(`Cost: ${action.deployCost.dividedBy(10**9)}`);
    console.log('');
  }
}


// Deploy contracts
(async () => {
  await tonWrapper.setup();
  
  tonWrapper.keys.map((key, i) => console.log(`Key #${i} - ${JSON.stringify(key)}`));

  const migration = new Migration(tonWrapper);
  
  const Bridge = await freeton
    .requireContract(tonWrapper, 'Bridge');
  const EthereumEventConfiguration = await freeton
    .requireContract(tonWrapper, 'EthereumEventConfiguration');
  const EthereumEvent = await freeton
    .requireContract(tonWrapper, 'EthereumEvent');
  const BridgeConfigurationUpdate = await freeton
    .requireContract(tonWrapper, 'BridgeConfigurationUpdate');
  
  // - Deploy Bridge
  await migration.deploy(Bridge, {
    _relayKeys: tonWrapper.keys.map((key) => `0x${key.public}`),
    _bridgeConfiguration: {
      ethereumEventConfigurationCode: EthereumEventConfiguration.code,
      ethereumEventConfigurationRequiredConfirmations: 2,
      ethereumEventConfigurationRequiredRejects: 2,
      ethereumEventConfigurationInitialBalance: utils.convertCrystal('20', 'nano'),

      ethereumEventCode: EthereumEvent.code,
  
      bridgeConfigurationUpdateCode: BridgeConfigurationUpdate.code,
      bridgeConfigurationUpdateRequiredConfirmations: 2,
      bridgeConfigurationUpdateRequiredRejects: 2,
      bridgeConfigurationUpdateInitialBalance: utils.convertCrystal('20', 'nano'),

      active: true,
    }
  }, {}, utils.convertCrystal('100', 'nano'));
  
  // - Deploy Target
  const Target = await freeton.requireContract(tonWrapper, 'Target');
  await migration.deploy(Target,
    {},
    {},
    utils.convertCrystal('10', 'nano')
  );
  
  // - Deploy EventProxy
  const EventProxy = await freeton.requireContract(tonWrapper, 'EventProxy');
  await migration.deploy(EventProxy,
    {},
    {},
    utils.convertCrystal('10', 'nano')
  );
  
  migration.logHistory();
  
  process.exit(0);
})();
