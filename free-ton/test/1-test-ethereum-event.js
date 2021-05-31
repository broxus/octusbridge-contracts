const {
  setupBridge
} = require('./utils');



describe('Test ethereum event', async function() {
  this.timeout(100000);

  let bridge;
  let owner;
  
  it('Setup bridge', async () => {
    let {
      bridge,
      owner
    } = await setupBridge();
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
  
  });
});
