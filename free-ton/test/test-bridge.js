require('dotenv').config({ path: './env/freeton.env' });

const logger = require('mocha-logger');
const assert = require('assert');
const {
  ContractWrapper,
  TonWrapper
} = require('./freeton-truffle');
const utils = require('./utils');

let bridgeContract;
let ethereumEventConfigurationContract;
let ethereumEventContract;
let targetContract;
let eventProxyContract;


const giverConfig = {
  address: process.env.GIVER_CONTRACT,
  abi: JSON.parse(process.env.GIVER_ABI),
};

const tonWrapper = new TonWrapper({
  network: process.env.NETWORK,
  seed: process.env.SEED,
  giverConfig,
});


const ethereumEventABI = '{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"state","type":"uint256"},{"indexed":false,"internalType":"address","name":"author","type":"address"}],"name":"StateChange","type":"event"}';
const ethereumEventAddress = '0x62a84E9356E62Bd003c97E138b65a8661762A2E0';
const ethereumEventTransaction = '0x794396dde8d19d69a0a91b2eeb249a02631e48c0809c701bfb95fb24d64a5b7f';
const ethereumEventIndex = 0;

describe('Test FreeTON bridge', function() {
  this.timeout(100000);
  
  before(async function() {
    await tonWrapper.setup();
  });
  
  it('Deploy bridge', async function() {
    bridgeContract = new ContractWrapper(
      tonWrapper,
      utils.loadJSONFromFile(process.env.CONTRACT_BRIDGE_ABI),
    );

    // Get EthereumEventConfiguration code from the TVC
    const {
      codeBase64: _ethereumEventConfigurationCode
    } = await tonWrapper
      .ton
      .contracts
      .getCodeFromImage({
        imageBase64: utils.loadBase64FromFile(
          process.env.CONTRACT_ETHEREUM_EVENT_CONFIGURATION_BASE64
        ),
      });
    
    // Get EthereumEvent code from the TVC
    const {
      codeBase64: _ethereumEventCode
    } = await tonWrapper
      .ton
      .contracts
      .getCodeFromImage({
        imageBase64: utils.loadBase64FromFile(
          process.env.CONTRACT_ETHEREUM_EVENT_BASE64
        ),
      });

    // Deploy Bridge contract
    await bridgeContract.deploy(
      utils.loadBase64FromFile(process.env.CONTRACT_BRIDGE_BASE64),
      {
        _ethereumEventConfigurationCode,
        _ethereumEventCode,
        _relayKeys: tonWrapper.keys.map(({ secret }) => `0x${secret}`),
        _ethereumEventConfigurationRequiredConfirmations: 2,
        _ethereumEventConfigurationRequiredRejects: 2,
      },
      {
        nonce: utils.getRandomNonce(),
      },
      utils.convertCrystal('1000', 'nano'),
    );

    logger.success(`Bridge address - ${bridgeContract.address}`);
  });

  it('Deploy target', async () => {
    targetContract = new ContractWrapper(
      tonWrapper,
      utils.loadJSONFromFile(process.env.CONTRACT_TARGET_ABI),
    );

    await targetContract.deploy(
      utils.loadBase64FromFile(process.env.CONTRACT_TARGET_BASE64),
      {},
      {
        nonce: utils.getRandomNonce(),
      },
      utils.convertCrystal('10', 'nano'),
    );

    logger.success(`Target address - ${targetContract.address}`);
  });

  it('Deploy Event Proxy', async () => {
    eventProxyContract = new ContractWrapper(
      tonWrapper,
      utils.loadJSONFromFile(process.env.CONTRACT_EVENT_PROXY_ABI),
    );

    await eventProxyContract.deploy(
      utils.loadBase64FromFile(process.env.CONTRACT_EVENT_PROXY_BASE64),
      {},
      {
        nonce: utils.getRandomNonce(),
      },
      utils.convertCrystal('10', 'nano'),
    );

    logger.success(`Event proxy address - ${eventProxyContract.address}`);
  });

  it('Add Ethereum event configuration', async () => {
    const ethereumEventABIAsBytes = utils.stringToBytesArray(ethereumEventABI);
    const ethereumAddressAsBytes = utils.stringToBytesArray(ethereumEventAddress);

    // Add Event
    await bridgeContract.run(
      'addEthereumEventConfiguration',
      {
        ethereumEventABI: ethereumEventABIAsBytes,
        ethereumAddress: ethereumAddressAsBytes,
        eventProxyAddress: eventProxyContract.address,
      }
    );

    // Derive EthereumEventConfiguration address from the event
    const [{
      output: {
        ethereumEventConfigurationAddress,
      }
    }] = await bridgeContract.getEvents('AddEthereumEventConfigurationEvent');

    logger.success(`Ethereum event configuration address: ${ethereumEventConfigurationAddress}`);

    ethereumEventConfigurationContract = new ContractWrapper(
      tonWrapper,
      utils.loadJSONFromFile(
        process.env.CONTRACT_ETHEREUM_EVENT_CONFIGURATION_ABI
      ),
      ethereumEventConfigurationAddress,
    );

    // Check the deployed data
    const ethereumEventConfigurationDetails = await ethereumEventConfigurationContract
      .runLocal('getDetails', {});
    
    // console.log(ethereumEventConfigurationDetails);
    
    assert.equal(
      ethereumEventConfigurationDetails._proxyAddress,
      eventProxyContract.address,
      'Wrong proxy address',
    );

    assert.equal(
      ethereumEventConfigurationDetails._eventABI.toString('utf8'),
      ethereumEventABI,
      'Wrong Ethereum Event ABI',
    );

    assert.equal(
      ethereumEventConfigurationDetails._eventAddress.toString('utf8'),
      ethereumEventAddress,
      'Wrong Ethereum Event address',
    );
  
    assert.equal(
      ethereumEventConfigurationDetails._confirmKeys.length,
      1,
      'Wrong amount of confirmations',
    );
  
    assert.equal(
      ethereumEventConfigurationDetails._active,
      false,
      'Wrong active status',
    );
  });

  it('Confirm Ethereum event configuration', async () => {
    // Confirm with another relay key
    await bridgeContract.run(
      'confirmEthereumEventConfiguration',
      {
        ethereumEventConfigurationAddress: ethereumEventConfigurationContract.address
      },
      tonWrapper.keys[1]
    );

    // Check the deployed data
    const ethereumEventConfigurationDetails = await ethereumEventConfigurationContract
      .runLocal('getDetails', {});

    assert.equal(
      ethereumEventConfigurationDetails._confirmKeys.length,
      2,
      'Wrong amount of confirmations',
    );

    assert.equal(
      ethereumEventConfigurationDetails._active,
      true,
      'Wrong active status',
    );
  });

  it('Emit Ethereum event', async () => {
    await bridgeContract.run('confirmEthereumEvent', {
      eventTransaction: utils.stringToBytesArray(ethereumEventTransaction),
      eventIndex: ethereumEventIndex,
      eventData: '',
      ethereumEventConfigurationAddress: ethereumEventConfigurationContract.address
    });

    const [{
      output: {
        ethereumEventAddress,
      }
    }] = await ethereumEventConfigurationContract.getEvents('ConfirmEthereumEvent');

    logger.success(`Ethereum event address: ${ethereumEventAddress}`);

    ethereumEventContract = new ContractWrapper(
      tonWrapper,
      utils.loadJSONFromFile(process.env.CONTRACT_ETHEREUM_EVENT_ABI),
      ethereumEventAddress,
    );

    const details = await ethereumEventContract.runLocal('getDetails', {});
    // console.log(details);
  });

  it('Confirm Ethereum event', async () => {
    await bridgeContract.run('confirmEthereumEvent', {
      eventTransaction: utils.stringToBytesArray(ethereumEventTransaction),
      eventIndex: ethereumEventIndex,
      eventData: '',
      ethereumEventConfigurationAddress: ethereumEventConfigurationContract.address
    });

    const details = await ethereumEventContract.runLocal('getDetails', {});
    // console.log(details);
  });
});
