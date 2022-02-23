const {
  expect,
} = require('../utils');


describe('Test MultiVault initial setup', async () => {
  let bridge, multivault;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
  
    bridge = await ethers.getContract('Bridge');
    multivault = await ethers.getContract('MultiVault');
  });

  it('Check multivault bridge', async () => {
    expect(await multivault.bridge())
      .to.be.equal(bridge.address, 'MultiVault: wrong bridge');
  });

  it('Check multivault governance', async () => {
    const { owner } = await getNamedAccounts();

    expect(await multivault.governance())
        .to.be.equal(owner, 'MultiVault: wrong governance');
  });
});
