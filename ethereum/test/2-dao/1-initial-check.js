const {
  logger,
  expect,
  ...utils
} = require('../utils');


describe('Test DAO initial setup', async () => {
  let bridge, dao;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    bridge = await ethers.getContract('Bridge');
    dao = await ethers.getContract('DAO');
    
    logger.log(`Bridge: ${bridge.address}`);
    logger.log(`DAO: ${dao.address}`);
  });
  
  describe('Initial checks', async () => {
    it('Check bridge owned by dao', async () => {
      expect(await bridge.owner())
        .to.be.equal(dao.address, 'Bridge owner is not dao');
    });
  });
});
