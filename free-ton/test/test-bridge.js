require('dotenv').config({ path: './env/freeton.env' });

const logger = require('mocha-logger');
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
};


describe('Test FreeTON bridge', function() {
  this.timeout(10000);

  before(async () => {
    logger.log('Deploying contracts');

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


    logger.success(`Bridge address - ${bridgeContract.address}`);
    logger.success(`Target address - ${targetContract.address}`);
    logger.success(`Event proxy address - ${eventProxyContract.address}`);
  });
  
  it('Add event configuration', async () => {
  
  });
  
  it('Confirm event configuration', async () => {
  
  });
  
  it('Emit event', async () => {
  
  });
  
  it('Confirm event', async () => {
  
  });
});
