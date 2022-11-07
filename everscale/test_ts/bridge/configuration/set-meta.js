const {
  setupRelays,
  setupBridge,
  setupEthereumEverscaleEventConfiguration,
  setupSolanaEverscaleEventConfiguration,
  setupEverscaleEthereumEventConfiguration,
  setupEverscaleSolanaEventConfiguration,
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
  
  describe('Ethereum Everscale event configuration', async () => {
    let ethereumEverscaleEventConfiguration, proxy;
    
    it('Setup Ethereum Everscale event configuration', async () => {
      [ethereumEverscaleEventConfiguration, proxy] = await setupEthereumEverscaleEventConfiguration(
        bridgeOwner,
        bridge,
        cellEncoder,
      );
    });
    
    it('Set Ethereum Everscale meta', async () => {
      await bridgeOwner.runTarget({
        contract: ethereumEverscaleEventConfiguration,
        method: 'setMeta',
        params: {
          _meta: ''
        }
      });
    });
    
    it('Check Ethereum Everscale configuration meta', async () => {
      const details = await ethereumEverscaleEventConfiguration.call({ method: 'getDetails' });
      
      expect(details._meta)
        .to.be.equal(emptyCell, 'Wrong meta');
    });
  });
  
  describe('Everscale Ethereum event configuration', async () => {
    let everscaleEthereumEventConfiguration;

    it('Setup event configuration', async () => {
      [everscaleEthereumEventConfiguration] = await setupEverscaleEthereumEventConfiguration(
        bridgeOwner,
        bridge,
        cellEncoder,
      );
    });

    it('Set Everscale Ethereum meta', async () => {
      await bridgeOwner.runTarget({
        contract: everscaleEthereumEventConfiguration,
        method: 'setMeta',
        params: {
          _meta: ''
        }
      });
    });

    it('Check Everscale Ethereum configuration meta', async () => {
      const details = await everscaleEthereumEventConfiguration.call({ method: 'getDetails' });

      expect(details._meta)
        .to.be.equal(emptyCell, 'Wrong meta');
    });
  });

  describe('Solana Everscale event configuration', async () => {
    let solanaEverscaleEventConfiguration, proxy;

    it('Setup Solana Everscale event configuration', async () => {
      [solanaEverscaleEventConfiguration, proxy] = await setupSolanaEverscaleEventConfiguration(
        bridgeOwner,
        bridge
      );
    });

    it('Set Solana Everscale meta', async () => {
      await bridgeOwner.runTarget({
        contract: solanaEverscaleEventConfiguration,
        method: 'setMeta',
        params: {
          _meta: ''
        }
      });
    });

    it('Check Solana Everscale configuration meta', async () => {
      const details = await solanaEverscaleEventConfiguration.call({ method: 'getDetails' });

      expect(details._meta)
        .to.be.equal(emptyCell, 'Wrong meta');
    });
  });

  describe('Everscale Solana event configuration', async () => {
    let everscaleSolanaEventConfiguration;

    it('Setup Everscale Solana event configuration', async () => {
      [everscaleSolanaEventConfiguration] = await setupEverscaleSolanaEventConfiguration(
        bridgeOwner,
        bridge,
      );
    });

    it('Set Everscale Solana meta', async () => {
      await bridgeOwner.runTarget({
        contract: everscaleSolanaEventConfiguration,
        method: 'setMeta',
        params: {
          _meta: ''
        }
      });
    });

    it('Check Everscale Solana configuration meta', async () => {
      const details = await everscaleSolanaEventConfiguration.call({ method: 'getDetails' });

      expect(details._meta)
        .to.be.equal(emptyCell, 'Wrong meta');
    });
  });
});
