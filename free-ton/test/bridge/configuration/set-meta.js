const {
  setupRelays,
  setupBridge,
  setupEthereumEventConfiguration,
  setupTonEventConfiguration,
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
    let ethereumEventConfiguration, proxy;
    
    it('Setup event configuration', async () => {
      [ethereumEventConfiguration, proxy] = await setupEthereumEventConfiguration(
        bridgeOwner,
        bridge,
        cellEncoder,
      );
    });
    
    it('Set meta', async () => {
      await bridgeOwner.runTarget({
        contract: ethereumEventConfiguration,
        method: 'setMeta',
        params: {
          _meta: ''
        }
      });
    });
    
    it('Check configuration meta', async () => {
      const details = await ethereumEventConfiguration.call({ method: 'getDetails' });
      
      expect(details._meta)
        .to.be.equal(emptyCell, 'Wrong meta');
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

    it('Set meta', async () => {
      await bridgeOwner.runTarget({
        contract: tonEventConfiguration,
        method: 'setMeta',
        params: {
          _meta: ''
        }
      });
    });

    it('Check configuration meta', async () => {
      const details = await tonEventConfiguration.call({ method: 'getDetails' });

      expect(details._meta)
        .to.be.equal(emptyCell, 'Wrong meta');
    });
  });
});
