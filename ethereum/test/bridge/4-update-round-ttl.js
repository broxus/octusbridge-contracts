describe('Test updating round ttl', async () => {
  let bridge;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    bridge = await ethers.getContract('Bridge');
  });
  
  it('Try to update round ttl with stranger', async () => {
  
  });
  
  it('Update round ttl', async () => {
  
  });
});
