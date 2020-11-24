require('dotenv').config({ path: './env/freeton.env' });

const logger = require('mocha-logger');
const assert = require('assert');
const { ContractWrapper } = require('./contract-wrapper');
const utils = require('./utils');

let bridgeContract;
let targetContract;
let eventProxyContract;


const contractWrapperConfig = {
  network: process.env.NETWORK,
  keys: {
    public: process.env.PUBLIC_KEY,
    secret: process.env.SECRET_KEY,
  },
  giver: process.env.GIVER_CONTRACT,
  giverAbi: JSON.parse(process.env.GIVER_ABI),
};


describe('Test FreeTON bridge', function() {
  before(async function () {
    this.timeout(100000);

    logger.success('Deploying contracts');

    bridgeContract = new ContractWrapper(
      contractWrapperConfig,
      utils.loadJSONFromFile(process.env.CONTRACT_BRIDGE_ABI),
    );
    await bridgeContract.deploy(
      utils.loadBase64FromFile(process.env.CONTRACT_BRIDGE_BASE64),
      {},
      {
        nonce: utils.getRandomNonce(),
      }
    );
  
    logger.success(`Bridge address - ${bridgeContract.address}`);
  
    targetContract = new ContractWrapper(
      contractWrapperConfig,
      utils.loadJSONFromFile(process.env.CONTRACT_TARGET_ABI),
    );
    await targetContract.deploy(
      utils.loadBase64FromFile(process.env.CONTRACT_TARGET_BASE64),
      {},
      {
        nonce: utils.getRandomNonce(),
      }
    );
  
    logger.success(`Target address - ${targetContract.address}`);
  
    eventProxyContract = new ContractWrapper(
      contractWrapperConfig,
      utils.loadJSONFromFile(process.env.CONTRACT_EVENT_PROXY_ABI),
    );
    await eventProxyContract.deploy(
      utils.loadBase64FromFile(process.env.CONTRACT_EVENT_PROXY_BASE64),
      {},
      {
        nonce: utils.getRandomNonce(),
      }
    );
    
    logger.success(`Event proxy address - ${eventProxyContract.address}`);
  });
  
  it('Add Ethereum event configuration', async () => {
    const ethereumEventABIAsBytes = utils.stringToBytesArray('{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"state","type":"uint256"},{"indexed":false,"internalType":"address","name":"author","type":"address"}],"name":"StateChange","type":"event"}');
    const ethereumAddressAsBytes = utils.stringToBytesArray('0x62a84E9356E62Bd003c97E138b65a8661762A2E0');

    await bridgeContract.run('addEthereumEventConfiguration', {
      ethereumEventABI: ethereumEventABIAsBytes,
      ethereumAddress: ethereumAddressAsBytes,
      eventProxyAddress: eventProxyContract.address,
    });
  
    const ethereumEvents = await bridgeContract
      .runLocal('getEthereumEventsConfiguration');
    
    assert.deepStrictEqual(
      ethereumEvents.length,
      1,
      'Wrong Ethereum events size',
    );
    
    const [ethereumEvent] = ethereumEvents;
    
    assert.deepStrictEqual(
      parseInt(ethereumEvent.confirmations, 16),
      1,
      'Wrong Ethereum event confirmations'
    );
  
    assert.deepStrictEqual(
      ethereumEvent.confirmed,
      false,
      'Wrong Ethereum event confirmation status'
    );
  });
  
  it('Confirm Ethereum event configuration', async () => {
    await bridgeContract.run('confirmEthereumEventConfiguration', {
      ethereumEventConfigurationID: 0,
    });
  
    const [ethereumEvent] = await bridgeContract
      .runLocal('getEthereumEventsConfiguration');

    assert.deepStrictEqual(
      parseInt(ethereumEvent.confirmations, 16),
      2,
      'Wrong Ethereum event confirmations'
    );
  
    assert.deepStrictEqual(
      ethereumEvent.confirmed,
      true,
      'Wrong Ethereum event confirmation status'
    );
  });
  
  it('Emit Ethereum event', async () => {
  
  });
  
  it('Confirm Ethereum event', async () => {
  
  });
});