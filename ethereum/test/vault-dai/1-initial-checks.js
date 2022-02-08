const { legos } = require('@studydefi/money-legos');
const {
  expect,
  ...utils
} = require('../utils');


describe('Test Vault DAI initial setup', async () => {
  let bridge, registry, vault;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
  
    bridge = await ethers.getContract('Bridge');
    registry = await ethers.getContract('Registry');
    vault = await ethers.getContract('VaultDai');
  });

  it('Check registry latest vault release', async () => {
    const vault = await ethers.getContract('Vault');
    
    expect(await registry.vaultReleases(0))
      .to.be.equal(vault.address, 'Wrong vault release');
  });

  it('Check vault target decimals', async () => {
    expect(await vault.targetDecimals())
      .to.be.equal(9, 'Wrong target decimals');
  });
  
  it('Check vault token decimals', async () => {
    expect(await vault.tokenDecimals())
      .to.be.equal(legos.erc20.dai.decimals, 'Wrong token decimals');
  });
  
  it('Check vault bridge', async () => {
    expect(await vault.bridge())
      .to.be.equal(bridge.address, 'Vault looks at the wrong bridge');
  });

  it('Check withdraw limit per period', async () => {
    expect(await vault.withdrawLimitPerPeriod())
        .to.not.be.equal(0, 'Wrong withdraw limit per period');
  });

  it('Check undeclared withdraw limit', async () => {
    expect(await vault.undeclaredWithdrawLimit())
        .to.not.be.equal(0, 'Wrong withdraw limit per period');
  });

  it('Check deposit limit', async () => {
    expect(await vault.depositLimit())
        .to.not.be.equal(0, 'Wrong withdraw limit per period');
  });

  it('Check Everscale configuration', async () => {
    expect(await vault.configuration())
        .to.not.be.equal(utils.defaultConfiguration, 'Wrong withdraw limit per period');
  });
});
