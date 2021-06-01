const {
  setupBridge,
  logger
} = require('./utils');
const BigNumber = require('bignumber.js');



describe('Test updating ethereum event configuration', async function() {
  this.timeout(100000);

  let owner, bridge, cellEncoder;
  
  it('Setup bridge', async () => {
    [owner, bridge, cellEncoder] = await setupBridge();
    
    owner = _owner;
    bridge = _bridge;
  });
  
  describe('Setup ethereum event configuration', async () => {
    let ethereumEventConfiguration;
    let eventProxy;

    it('Deploy event proxy', async () => {
    
    });
    
    // it('Deploy event configuration', async () => {
    //   const EthereumEventConfiguration = await locklift.factory.getContract('EthereumEventConfiguration');
    //   const EthereumEvent = await locklift.factory.getContract('EthereumEvent');
    //
    //   const [keyPair] = await locklift.keys.getKeyPairs();
    //
    //   ethereumEventConfiguration = await locklift.giver.deployContract({
    //     contract: EthereumEventConfiguration,
    //     constructorParams: {
    //       _owner: owner.address,
    //     },
    //     initParams: {
    //       basicInitData: {
    //         eventRequiredConfirmations: 2,
    //         eventRequiredRejects: 2,
    //         eventInitialBalance: locklift.utils.convertCrystal('10', 'nano'),
    //         bridgeAddress: bridge.address,
    //         eventCode: EthereumEvent.code,
    //         meta: configurationMeta
    //       },
    //       initData: {
    //         eventAddress: new BigNumber(0),
    //         eventBlocksToConfirm: 1,
    //         proxyAddress: eventProxy.address,
    //         startBlockNumber: 0,
    //       }
    //     },
    //     keyPair
    //   }, locklift.utils.convertCrystal(20, 'nano'));
    //
    //   logger.log(`Ethereum event configuration: ${ethereumEventConfiguration.address}`);
    // });
  });
  
  it('Update event configuration details', async () => {
  
  });
});
