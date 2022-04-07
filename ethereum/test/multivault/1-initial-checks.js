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

  it('Check alien default deposit fee', async () => {
    expect(await multivault.defaultAlienDepositFee())
        .to.be.not.equal(0, 'Default multivault alien deposit fee is zero');
  });

  it('Check alien default withdraw fee', async () => {
    expect(await multivault.defaultAlienWithdrawFee())
        .to.be.not.equal(0, 'Default multivault alien withdraw fee is zero');
  });

  it('Check native default deposit fee', async () => {
    expect(await multivault.defaultNativeDepositFee())
        .to.be.not.equal(0, 'Default multivault native deposit fee is zero');
  });

  it('Check native default withdraw fee', async () => {
    expect(await multivault.defaultNativeWithdrawFee())
        .to.be.not.equal(0, 'Default multivault native withdraw fee is zero');
  });
});
