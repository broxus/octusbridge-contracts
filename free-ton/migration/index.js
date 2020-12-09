const fs = require('fs');

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
  constructor() {
    if (!fs.existsSync('migration-log.json')) {
      this._writeContent({});
    }
  }
  
  update({ name, address }) {
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
}


// Deploy contracts
(async () => {
  await tonWrapper.setup();
  
  tonWrapper.keys.map((key, i) => console.log(`Key #${i} - ${JSON.stringify(key)}`));

  const migration = new Migration();
  
  // - Deploy Bridge
  const Bridge = await freeton.requireContract(tonWrapper, 'Bridge');
  const EthereumEventConfiguration = await freeton.requireContract(tonWrapper, 'EthereumEventConfiguration');
  const EthereumEvent = await freeton.requireContract(tonWrapper, 'EthereumEvent');
  const BridgeConfigurationUpdate = await freeton.requireContract(tonWrapper, 'BridgeConfigurationUpdate');
  
  await Bridge.deploy({
    _relayKeys: tonWrapper.keys.map((key) => `0x${key.public}`),
    _bridgeConfiguration: {
      ethereumEventConfigurationCode: EthereumEventConfiguration.code,
      ethereumEventConfigurationRequiredConfirmations: 2,
      ethereumEventConfigurationRequiredRejects: 2,
      ethereumEventConfigurationInitialBalance: utils.convertCrystal('100', 'nano'),

      ethereumEventCode: EthereumEvent.code,
  
      bridgeConfigurationUpdateCode: BridgeConfigurationUpdate.code,
      bridgeConfigurationUpdateRequiredConfirmations: 2,
      bridgeConfigurationUpdateRequiredRejects: 2,
      bridgeConfigurationUpdateInitialBalance: utils.convertCrystal('100', 'nano'),

      active: true,
    }
  }, {}, utils.convertCrystal('10000', 'nano'));

  migration.update(Bridge);
  
  console.log(`Bridge address: ${Bridge.address}`);
  
  // - Deploy Target
  const Target = await freeton.requireContract(tonWrapper, 'Target');
  await Target.deploy({}, {}, utils.convertCrystal('10', 'nano'));
  
  migration.update(Target);
  
  console.log(`Target address: ${Target.address}`);
  
  // - Deploy EventProxy
  const EventProxy = await freeton.requireContract(tonWrapper, 'EventProxy');
  await EventProxy.deploy({}, {}, utils.convertCrystal('10', 'nano'));
  
  migration.update(EventProxy);
  
  console.log(`EventProxy address: ${EventProxy.address}`);
  
  
  process.exit(0);
})();
