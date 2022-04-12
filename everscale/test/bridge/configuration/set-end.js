const {
  setupRelays,
  setupBridge,
  setupEthereumEverscaleEventConfiguration,
  setupSolanaEverscaleEventConfiguration,
  setupEverscaleEthereumEventConfiguration,
  setupEverscaleSolanaEventConfiguration,
  expect,
} = require('../../utils');


describe('Test setting configuration end', async function() {
  this.timeout(10000000);

  let bridge, bridgeOwner, staking, cellEncoder;
  
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
    
    it('Set Ethereum Everscale end block', async () => {
      await bridgeOwner.runTarget({
        contract: ethereumEverscaleEventConfiguration,
        method: 'setEndBlockNumber',
        params: {
          endBlockNumber: 1
        }
      });
    });
    
    it('Check Ethereum Everscale configuration end block', async () => {
      const details = await ethereumEverscaleEventConfiguration.call({ method: 'getDetails' });

      expect(details._networkConfiguration.endBlockNumber)
        .to.be.bignumber.equal(1, 'Wrong end block number');
    });

    it('Try to deploy event after end block', async () => {

    });
  });
  
  describe('Everscale Ethereum event configuration', async () => {
    let everscaleEthereumEventConfiguration;

    it('Setup Everscale Ethereum event configuration', async () => {
      [everscaleEthereumEventConfiguration] = await setupEverscaleEthereumEventConfiguration(
        bridgeOwner,
        bridge,
        cellEncoder,
      );
    });
    
    it('Set Everscale Ethereum end timestamp', async () => {
      await bridgeOwner.runTarget({
        contract: everscaleEthereumEventConfiguration,
        method: 'setEndTimestamp',
        params: {
          endTimestamp: 1
        }
      });
    });
  
    it('Check Everscale Ethereum configuration end timestamp', async () => {
      const details = await everscaleEthereumEventConfiguration.call({ method: 'getDetails' });

      expect(details._networkConfiguration.endTimestamp)
        .to.be.bignumber.equal(1, 'Wrong end timestamps');
    });

    it('Try to deploy event after end timestamp', async () => {

    });
  });

  describe('Solana Everscale event configuration', async () => {
    let solanaEverscaleEventConfiguration, proxy;

    it('Setup Solana Everscale event configuration', async () => {
      [solanaEverscaleEventConfiguration, proxy] = await setupSolanaEverscaleEventConfiguration(
        bridgeOwner,
        bridge,
        cellEncoder,
      );
    });

    it('Set Solana Everscale end block', async () => {
      await bridgeOwner.runTarget({
        contract: solanaEverscaleEventConfiguration,
        method: 'setEndBlockNumber',
        params: {
          endBlockNumber: 1
        }
      });
    });

    it('Check Solana Everscale configuration end block', async () => {
      const details = await solanaEverscaleEventConfiguration.call({ method: 'getDetails' });

      expect(details._networkConfiguration.endBlockNumber)
        .to.be.bignumber.equal(1, 'Wrong end block number');
    });

    it('Try to deploy event after end block', async () => {

    });
  });

  describe('Everscale Solana event configuration', async () => {
    let everscaleSolanaEventConfiguration;

    it('Setup Everscale Solana event configuration', async () => {
      [everscaleSolanaEventConfiguration] = await setupEverscaleSolanaEventConfiguration(
        bridgeOwner,
        bridge,
        cellEncoder,
      );
    });

    it('Set Everscale Solana end timestamp', async () => {
      await bridgeOwner.runTarget({
        contract: everscaleSolanaEventConfiguration,
        method: 'setEndTimestamp',
        params: {
          endTimestamp: 1
        }
      });
    });

    it('Check Everscale Solana configuration end timestamp', async () => {
      const details = await everscaleSolanaEventConfiguration.call({ method: 'getDetails' });

      expect(details._networkConfiguration.endTimestamp)
        .to.be.bignumber.equal(1, 'Wrong end timestamps');
    });

    it('Try to deploy event after end timestamp', async () => {

    });
  });
});
