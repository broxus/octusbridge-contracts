const {
  setupRelays,
  setupBridge,
  setupEthereumEventConfiguration,
  setupEverscaleEventConfiguration,
  expect,
} = require('../../utils');


describe('Test setting configuration end', async function() {
  this.timeout(10000000);

  let bridge, bridgeOwner, staking, cellEncoder;
  
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
    
    it('Set end block', async () => {
      await bridgeOwner.runTarget({
        contract: ethereumEverscaleEventConfiguration,
        method: 'setEndBlockNumber',
        params: {
          endBlockNumber: 1
        }
      });
    });
    
    it('Check configuration end block', async () => {
      const details = await ethereumEverscaleEventConfiguration.call({ method: 'getDetails' });

      expect(details._networkConfiguration.endBlockNumber)
        .to.be.bignumber.equal(1, 'Wrong end block number');
    });

    it('Try to deploy event after end block', async () => {

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
    
    it('Set end timestamp', async () => {
      await bridgeOwner.runTarget({
        contract: everscaleEthereumEventConfiguration,
        method: 'setEndTimestamp',
        params: {
          endTimestamp: 1
        }
      });
    });
  
    it('Check configuration end timestamp', async () => {
      const details = await everscaleEthereumEventConfiguration.call({ method: 'getDetails' });

      expect(details._networkConfiguration.endTimestamp)
        .to.be.bignumber.equal(1, 'Wrong end timestamps');
    });

    it('Try to deploy event after end timestamp', async () => {

    });
  });
});
