const { legos } = require('@studydefi/money-legos');
const {
  expect,
  getVaultByToken
} = require('../utils');


describe('Test Vault DAI initial setup', async () => {
  let bridge, vault;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
  
    bridge = await ethers.getContract('Bridge');
    
    const registry = await ethers.getContract('Registry');
    vault = await getVaultByToken(registry, legos.erc20.dai.address);
  });
  
  it('Check vault bridge', async () => {
    expect(await vault.bridge())
      .to.be.equal(bridge.address, 'Vault looks at the wrong bridge');
  });
  
  it('Check vault activated', async () => {
    expect(await vault.activation())
      .to.be.not.equal(0, 'Vault not activated');
  });
});
