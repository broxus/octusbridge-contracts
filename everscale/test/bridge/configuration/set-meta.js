const {
  setupRelays,
  setupBridge,
  setupEthereumEventConfiguration,
  setupEverscaleEventConfiguration,
  expect,
} = require('../../utils');


describe('Test setting configuration meta', async function() {
  this.timeout(10000000);
  
  let bridge, bridgeOwner, staking, cellEncoder;
  
  const emptyCell = 'te6ccgEBAQEAAgAAAA==';
  
  it('Setup bridge', async () => {
    const relays = await setupRelays();
    
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  });
  
  describe('Ethereum event configuration', async () => {
    let ethereumEverscaleEventConfiguration, proxy;
    
    it('Setup event configuration', async () => {
      [ethereumEverscaleEventConfiguration, proxy] = await setupEthereumEventConfiguration(
        bridgeOwner,
        bridge,
        cellEncoder,
      );
    });
    
    it('Set meta', async () => {
      await bridgeOwner.runTarget({
        contract: ethereumEverscaleEventConfiguration,
        method: 'setMeta',
        params: {
          _meta: ''
        }
      });
    });
    
    it('Check configuration meta', async () => {
      const details = await ethereumEverscaleEventConfiguration.call({ method: 'getDetails' });
      
      expect(details._meta)
        .to.be.equal(emptyCell, 'Wrong meta');
    });
  });
  
  describe('Ton event configuration', async () => {
    let everscaleEthereumEventConfiguration;

    it('Setup event configuration', async () => {
      [everscaleEthereumEventConfiguration] = await setupEverscaleEventConfiguration(
        bridgeOwner,
        bridge,
        cellEncoder,
      );
    });

    it('Set meta', async () => {
      await bridgeOwner.runTarget({
        contract: everscaleEthereumEventConfiguration,
        method: 'setMeta',
        params: {
          _meta: ''
        }
      });
    });

    it('Check configuration meta', async () => {
      const details = await everscaleEthereumEventConfiguration.call({ method: 'getDetails' });

      expect(details._meta)
        .to.be.equal(emptyCell, 'Wrong meta');
    });
  });
});
