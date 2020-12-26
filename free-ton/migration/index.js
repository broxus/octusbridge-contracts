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
  
  updateLog(historyAction) {
    const migrationLog = JSON.parse(fs.readFileSync('migration-log.json', 'utf8'));
    
    const extendedLog = {
      ...migrationLog,
      [historyAction.alias]: {
        address: historyAction.contract.address,
        name: historyAction.contract.name,
      }
    };
    
    this._writeContent(extendedLog);
  }
  
  _writeContent(content) {
    fs.writeFileSync('migration-log.json', JSON.stringify(content));
  }
  
  async getGiverBalance() {
    return this.tonWrapper.getBalance(this.tonWrapper.giverConfig.address);
  }
  
  async deploy({
    contract,
    constructorParams,
    initParams,
    initialBalance,
    truffleNonce,
    alias,
  }) {
    console.log(`Deploying ${contract.name}...`);
    
    const beforeDeployGiverBalance = await this.getGiverBalance();
  
    const status = await contract.deploy(
      constructorParams,
      initParams,
      initialBalance,
      truffleNonce
    );
    
    const afterDeployGiverBalance = await this.getGiverBalance();

    const deployCost = beforeDeployGiverBalance.minus(afterDeployGiverBalance);
    
    const historyAction = {
      alias: alias === undefined ? contract.name : alias,
      contract,
      deployCost,
      status
    };
    
    this._logHistoryAction(historyAction);

    this.updateHistory(historyAction);
    this.updateLog(historyAction);
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
    console.log(`Deployed ${action.contract.name} (alias - ${action.alias})`);
    console.log(`Address: ${action.contract.address}`);
    console.log(`Cost: ${action.deployCost.dividedBy(10**9)}`);
    console.log(`Transaction: ${action.status.transaction.id}`);
    console.log(`Message: ${action.status.transaction.in_msg}`);
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
  
  // - Deploy Bridge
  await migration.deploy({
    contract: Bridge,
    constructorParams: {
    _relayKeys: tonWrapper.keys.map((key) => `0x${key.public}`),
      _bridgeConfiguration: {
        eventConfigurationRequiredConfirmations: 2,
        eventConfigurationRequiredRejects: 2,
        bridgeConfigurationUpdateRequiredConfirmations: 2,
        bridgeConfigurationUpdateRequiredRejects: 2,
        bridgeRelayUpdateRequiredConfirmations: 10,
        bridgeRelayUpdateRequiredRejects: 5,
        active: true,
      }
    },
    initParams: {},
    initialBalance: utils.convertCrystal('50', 'nano'),
    truffleNonce: true,
  }).catch(e => console.log(e));
  
  // - Prepare Ethereum event configuration
  const EthereumEventConfiguration = await freeton
    .requireContract(tonWrapper, 'EthereumEventConfiguration');
  const EthereumEvent = await freeton
    .requireContract(tonWrapper, 'EthereumEvent');

  // -- Deploy Proxy contract
  const EventProxy = await freeton.requireContract(tonWrapper, 'EventProxy');
  await migration.deploy({
    contract : EventProxy,
    constructorParams: {},
    initParams: {},
    initialBalance: utils.convertCrystal('10', 'nano'),
    truffleNonce: true,
  }).catch(e => console.log(e));
  
  // -- Deploy EventConfiguration
  await migration.deploy({
    contract: EthereumEventConfiguration,
    constructorParams: {},
    initParams: {
      eventABI: utils.stringToBytesArray(''),
      eventAddress: 0,
      eventRequiredConfirmations: 2,
      eventRequiredRejects: 2,
      eventBlocksToConfirm: 1,
      eventInitialBalance: utils.convertCrystal('10', 'nano'),
      proxyAddress: EventProxy.address,
      bridgeAddress: Bridge.address,
      eventCode: EthereumEvent.code,
    },
    initialBalance: utils.convertCrystal('100', 'nano')
  }).catch(e => console.log(e));
  
  // - Prepare TON event configuration
  const TonEventConfiguration = await freeton
    .requireContract(tonWrapper, 'TonEventConfiguration');
  const TonEvent = await freeton
    .requireContract(tonWrapper, 'TonEvent');
  
  // -- Deploy EventConfiguration (no Proxy contract deploy needed)
  await migration.deploy({
    contract: TonEventConfiguration,
    constructorParams: {},
    initParams: {
      eventABI: utils.stringToBytesArray(''),
      eventAddress: Bridge.address,
      eventRequiredConfirmations: 2,
      eventRequiredRejects: 2,
      eventInitialBalance: utils.convertCrystal('10', 'nano'),
      proxyAddress: 0,
      bridgeAddress: Bridge.address,
      eventCode: TonEvent.code,
    },
    initialBalance: utils.convertCrystal('100', 'nano')
  }).catch(e => console.log(e));
  
  migration.logHistory();
  
  process.exit(0);
})();
