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
    let ethereumEventConfiguration, proxy;

    it('Setup event configuration', async () => {
      [ethereumEventConfiguration, proxy] = await setupEthereumEventConfiguration(
        bridgeOwner,
        bridge,
        cellEncoder,
      );
    });
    
    it('Set end block', async () => {
      await bridgeOwner.runTarget({
        contract: ethereumEventConfiguration,
        method: 'setEndBlockNumber',
        params: {
          endBlockNumber: 1
        }
      });
    });
    
    it('Check configuration end block', async () => {
      const details = await ethereumEventConfiguration.call({ method: 'getDetails' });

      expect(details._networkConfiguration.endBlockNumber)
        .to.be.bignumber.equal(1, 'Wrong end block number');
    });

    it('Try to deploy event after end block', async () => {

    });
  });
  
  describe('Ton event configuration', async () => {
    let everscaleEventConfiguration;

    it('Setup event configuration', async () => {
      [everscaleEventConfiguration] = await setupEverscaleEventConfiguration(
        bridgeOwner,
        bridge,
        cellEncoder,
      );
    });
    
    it('Set end timestamp', async () => {
      await bridgeOwner.runTarget({
        contract: everscaleEventConfiguration,
        method: 'setEndTimestamp',
        params: {
          endTimestamp: 1
        }
      });
    });
  
    it('Check configuration end timestamp', async () => {
      const details = await everscaleEventConfiguration.call({ method: 'getDetails' });

      expect(details._networkConfiguration.endTimestamp)
        .to.be.bignumber.equal(1, 'Wrong end timestamps');
    });

    it('Try to deploy event after end timestamp', async () => {

    });
  });
});
