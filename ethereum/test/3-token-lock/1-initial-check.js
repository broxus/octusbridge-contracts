const {
  logger,
  expect,
} = require('../utils');


describe('Test USDT token lock initial setup', async () => {
  let tokenLock, dao;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    tokenLock = await ethers.getContract('TokenLock_usdt');
    dao = await ethers.getContract('DAO');
  });
  
  describe('Initial checks', async () => {
    it('Check token lock owned by dao', async () => {
      expect(await tokenLock.owner())
        .to.be.equal(dao.address, 'Token lock owner is not dao');
    });
  });
});
