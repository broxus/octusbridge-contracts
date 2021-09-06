describe('Test bridge pause', async () => {
  let bridge;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    bridge = await ethers.getContract('Bridge');
  });

  describe('Pause bridge', async () => {
    it('Try to pause with stranger', async () => {
    
    });
    
    it('Pause', async () => {
    
    });
    
    it('Check signature verification fails', async () => {
    
    });
  });
  
  describe('Unpause', async () => {
    it('Try to unpause emergency with stranger', async () => {
    
    });
    
    it('Unpause', async () => {
    
    });
    
    it('Check signature verification passes', async () => {
    
    });
  });
});
