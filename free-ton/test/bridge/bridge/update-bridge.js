const {
  setupBridge,
  setupRelays,
} = require('../../utils');

const { expect } = require('chai');


describe('Test bridge update', async function() {
  this.timeout(10000000);
  
  let bridge, bridgeOwner, staking, cellEncoder;
  
  it('Deploy bridge', async () => {
    const relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  });
  
  it('Update active flag', async () => {
    await bridgeOwner.runTarget({
      contract: bridge,
      method: 'updateActive',
      params: {
        _active: false
      }
    });
    
    expect(await bridge.call({ method: 'active' }))
      .to.be.equal(false, 'Wrong active status');
  });

  it('Update connector deploy value', async () => {
    await bridgeOwner.runTarget({
      contract: bridge,
      method: 'updateConnectorDeployValue',
      params: {
        _connectorDeployValue: 1
      }
    });
  
    expect(await bridge.call({ method: 'connectorDeployValue' }))
      .to.be.bignumber.equal(1, 'Wrong connector deploy value');
  });
});
