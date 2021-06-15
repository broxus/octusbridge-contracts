const {
  setupBridge,
  setupEthereumEventConfiguration,
  setupTonEventConfiguration,
  expect,
} = require('./utils');
const BigNumber = require('bignumber.js');


describe('Test updating event configuration', async function() {
  this.timeout(100000);
  
  let bridge, bridgeOwner, staking, cellEncoder;
  
  it('Setup bridge', async () => {
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge();
  });
  
  describe('Ethereum event configuration', async () => {
    let ethereumEventConfiguration, proxy;

    it('Setup event configuration', async () => {
      [ethereumEventConfiguration, proxy] = await setupEthereumEventConfiguration(
        bridgeOwner,
        bridge,
        cellEncoder,
      );
    });
    
    it('Update configuration details', async () => {
      const details = await ethereumEventConfiguration.call({ method: 'getDetails' });
      
      details._basicInitData.bridge = locklift.utils.zeroAddress;
      details._initData.proxy = locklift.utils.zeroAddress;
  
      details._basicInitData.eventABI = details._basicInitData.eventABI.toString();
      
      await bridgeOwner.runTarget({
        contract: ethereumEventConfiguration,
        method: 'update',
        params: {
          _basicInitData: details._basicInitData,
          _initData: details._initData
        }
      });
    });
    
    it('Check updated details', async () => {
      const details = await ethereumEventConfiguration.call({ method: 'getDetails' });

      expect(details._basicInitData.bridge)
        .to.be.equal(locklift.utils.zeroAddress, 'Wrong bridge address');
      
      expect(details._initData.proxy)
        .to.be.equal(locklift.utils.zeroAddress, 'Wrong proxy address');
    });
  });
  
  describe('Ton event configuration', async () => {
    let tonEventConfiguration;

    it('Setup event configuration', async () => {
      [tonEventConfiguration] = await setupTonEventConfiguration(
        bridgeOwner,
        bridge,
        cellEncoder,
      );
    });
    
    it('Update configuration details', async () => {
      const details = await tonEventConfiguration.call({ method: 'getDetails' });
  
      details._basicInitData.eventRequiredRejects = new BigNumber(10);
      details._initData.startTimestamp = new BigNumber(1);
  
      details._basicInitData.eventABI = details._basicInitData.eventABI.toString();
  
      await bridgeOwner.runTarget({
        contract: tonEventConfiguration,
        method: 'update',
        params: {
          _basicInitData: details._basicInitData,
          _initData: details._initData
        }
      });
    });
  
    it('Check updated details', async () => {
      const details = await tonEventConfiguration.call({ method: 'getDetails' });
    
      expect(details._basicInitData.eventRequiredRejects)
        .to.be.bignumber.equal(10, 'Wrong event required rejects');
    
      expect(details._initData.startTimestamp)
        .to.be.bignumber.equal(1, 'Wrong start timestamp');
    });
  });
});
