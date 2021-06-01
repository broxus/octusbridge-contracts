const {
  setupBridge,
  setupEthereumEventConfiguration,
} = require('./utils');



describe('Test ethereum event', async function() {
  this.timeout(100000);
  
  let bridge, bridgeOwner, staking, cellEncoder;
  
  it('Setup bridge', async () => {
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge();
  });
  
  it('Setup ethereum event configuration', async () => {
    [ethereumEventConfiguration, tokenEventProxy] = await setupEthereumEventConfiguration(
      bridgeOwner,
      bridge,
      cellEncoder,
    );
  });
  
  describe('Test event confirmation', async () => {
    it('Create event', async () => {
    
    });
    
    it('Initialize event', async () => {
    
    });
    
    it('Confirm event enough times', async () => {
    
    });
  });
  
  describe('Test event rejection', async () => {
    it('Create event', async () => {
    
    });
  
    it('Initialize event', async () => {
    
    });
  
    it('Reject event enough times', async () => {
    
    });
  });
});
