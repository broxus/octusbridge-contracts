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
  });
  
  it('Check DAO has correct bridge', async () => {
    expect(await dao.bridge())
      .to.be.equal(bridge.address, 'DAO looks at the wrong bridge');
  });
});
