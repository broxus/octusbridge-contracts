const {
  setupBridge,
  setupRelays,
} = require('./utils');

const { expect } = require('chai');


describe('Test bridge update', async function() {
  this.timeout(100000);
  
  let bridge, bridgeOwner, staking, cellEncoder;
  
  it('Deploy bridge', async () => {
    const relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  });
  
  it('Update bridge configuration', async () => {
    const bridgeConfiguration = await bridge.call({ method: 'bridgeConfiguration' });

    bridgeConfiguration.active = false;
    bridgeConfiguration.staking = locklift.utils.zeroAddress;
    
    await bridgeOwner.runTarget({
      contract: bridge,
      method: 'updateBridgeConfiguration',
      params: {
        _bridgeConfiguration: bridgeConfiguration
      }
    });
  });
  
  it('Check new bridge configuration', async () => {
    const bridgeConfiguration = await bridge.call({ method: 'bridgeConfiguration' });

    expect(bridgeConfiguration.active)
      .to.be.equal(false, 'Wrong configuration active status');
    expect(bridgeConfiguration.staking)
      .to.be.equal(locklift.utils.zeroAddress,'Wrong configuration staking');
  });
});
