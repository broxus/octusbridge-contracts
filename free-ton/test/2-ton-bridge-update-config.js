require('dotenv').config({ path: './../env/freeton.env' });

const logger = require('mocha-logger');
const assert = require('assert');
const freeton = require('freeton-truffle');
const utils = require('freeton-truffle/utils');


const tonWrapper = new freeton.TonWrapper({
  network: process.env.NETWORK,
  seed: process.env.SEED,
  randomTruffleNonce: Boolean(process.env.RANDOM_TRUFFLE_NONCE),
});


let Bridge;
let BridgeConfigurationUpdate;


describe('Test Bridge configuration update', function() {
  this.timeout(12000000);
  
  let newBridgeConfiguration;
  
  before(async function() {
    await tonWrapper.setup();
  
    Bridge = await freeton.requireContract(tonWrapper, 'Bridge');
    await Bridge.loadMigration();
  });
  
  it('Initialize bridge configuration update', async function() {
    const {
      _bridgeConfiguration,
    } = await Bridge.runLocal('getDetails');
    
    assert.equal(
      _bridgeConfiguration.bridgeConfigurationUpdateRequiredConfirmations,
      2,
      'Wrong initial bridgeConfigurationUpdateRequiredConfirmations'
    );
  
    newBridgeConfiguration = {
      ..._bridgeConfiguration,
      bridgeConfigurationUpdateRequiredConfirmations: 3,
    };
    
    await Bridge.run('confirmBridgeConfigurationUpdate', {
      _bridgeConfiguration: newBridgeConfiguration,
    });
  
    const {
      output: {
        addr: bridgeConfigurationUpdateAddress,
      }
    } = (await Bridge.getEvents('NewBridgeConfigurationUpdate')).pop();
    
    logger.success(`Bridge configuration update address: ${bridgeConfigurationUpdateAddress}`);
    
    BridgeConfigurationUpdate = await freeton.requireContract(
      tonWrapper,
      'BridgeConfigurationUpdate',
      bridgeConfigurationUpdateAddress
    );
    
    const bridgeConfigurationUpdateDetails = await BridgeConfigurationUpdate
      .runLocal('getDetails');
    
    assert.equal(
      bridgeConfigurationUpdateDetails._confirmKeys.length,
      1,
      'Wrong confirm keys amount'
    );
  
    assert.equal(
      bridgeConfigurationUpdateDetails._rejectKeys.length,
      0,
      'Wrong reject keys amount'
    );
  
    assert.equal(
      bridgeConfigurationUpdateDetails._executed,
      false,
      'Wrong executed status'
    );
    
    assert.equal(
      bridgeConfigurationUpdateDetails._bridgeConfiguration.bridgeConfigurationUpdateRequiredConfirmations,
      3,
      'Wrong bridgeConfigurationUpdateRequiredConfirmations value'
    );
  });
  
  it('Confirm bridge configuration update', async function() {
    await Bridge.run('confirmBridgeConfigurationUpdate', {
      _bridgeConfiguration: newBridgeConfiguration,
    }, tonWrapper.keys[2]);
  
    const bridgeConfigurationUpdateDetails = await BridgeConfigurationUpdate.runLocal('getDetails');
  
    assert.equal(
      bridgeConfigurationUpdateDetails._confirmKeys.length,
      2,
      'Wrong confirm keys amount'
    );
  
    assert.equal(
      bridgeConfigurationUpdateDetails._executed,
      true,
      'Wrong executed status'
    );
    
    // Check that the Bridge configuration has been updated
    const {
      _bridgeConfiguration,
    } = await Bridge.runLocal('getDetails');
    
    assert.equal(
      _bridgeConfiguration.bridgeConfigurationUpdateRequiredConfirmations,
      3,
      'Wrong bridgeConfigurationUpdateRequiredConfirmations value',
    );
  });
});
