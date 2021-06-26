const {
  setupRelays,
  setupBridge,
  setupEthereumEventConfiguration,
  setupTonEventConfiguration,
  expect,
} = require('./utils');
const BigNumber = require('bignumber.js');


describe('Test updating event configuration', async function() {
  this.timeout(10000000);

  let bridge, bridgeOwner, staking, cellEncoder;
  
  it('Setup bridge', async () => {
    const relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
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
      
      details._basicConfiguration.staking = locklift.utils.zeroAddress;
      details._networkConfiguration.proxy = locklift.utils.zeroAddress;
  
      details._basicConfiguration.eventABI = details._basicConfiguration.eventABI.toString();
      
      await bridgeOwner.runTarget({
        contract: ethereumEventConfiguration,
        method: 'update',
        params: {
          _basicConfiguration: details._basicConfiguration,
          _networkConfiguration: details._networkConfiguration
        }
      });
    });
    
    it('Check updated details', async () => {
      const details = await ethereumEventConfiguration.call({ method: 'getDetails' });

      expect(details._basicConfiguration.staking)
        .to.be.equal(locklift.utils.zeroAddress, 'Wrong bridge address');
      
      expect(details._networkConfiguration.proxy)
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
  
      details._networkConfiguration.eventEmitter = locklift.utils.zeroAddress;
      details._networkConfiguration.startTimestamp = new BigNumber(1);
  
      details._basicConfiguration.eventABI = details._basicConfiguration.eventABI.toString();
  
      await bridgeOwner.runTarget({
        contract: tonEventConfiguration,
        method: 'update',
        params: {
          _basicConfiguration: details._basicConfiguration,
          _networkConfiguration: details._networkConfiguration
        }
      });
    });
  
    it('Check updated details', async () => {
      const details = await tonEventConfiguration.call({ method: 'getDetails' });
    
      expect(details._networkConfiguration.eventEmitter)
        .to.be.equal(locklift.utils.zeroAddress, 'Wrong event emitter');
    
      expect(details._networkConfiguration.startTimestamp)
        .to.be.bignumber.equal(1, 'Wrong start timestamp');
    });
  });
});
