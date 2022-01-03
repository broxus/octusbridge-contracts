const { legos } = require('@studydefi/money-legos');
const {
  expect,
  getVaultByToken
} = require('../utils');


describe('Test Vault DAI initial setup', async () => {
  let bridge, registry, vault, wrapper;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
  
    bridge = await ethers.getContract('Bridge');
    registry = await ethers.getContract('Registry');
  });
  
  it('Create vault', async () => {
    const owner = await ethers.getNamedSigner('owner');
    const { guardian } = await getNamedAccounts();
    
    await registry.connect(owner).newVault(
      legos.erc20.dai.address,
      guardian,
      9,
      0,
      0,
    );
    
    vault = await getVaultByToken(registry, legos.erc20.dai.address);
  
    wrapper = await ethers.getContractAt(
      'VaultWrapper',
      (await vault.wrapper())
    );
  });
  
  it('Check registry latest vault release', async () => {
    const vault = await ethers.getContract('Vault');
    
    expect(await registry.vaultReleases(0))
      .to.be.equal(vault.address, 'Wrong vault release');
  });
  
  it('Check registry latest wrapper release', async () => {
    const vaultWrapper = await ethers.getContract('VaultWrapper');
  
    expect(await registry.wrapperReleases(0))
      .to.be.equal(vaultWrapper.address, 'Wrong vault wrapper release');
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
  
  it('Check wrapper vault', async () => {
    expect(await wrapper.vault())
      .to.be.equal(vault.address, 'Wrong vault at wrapper');
  });
  
  it('Check vault activated', async () => {
    expect(await vault.activation())
      .to.be.not.equal(0, 'Vault not activated');
  });
  
  it('Check decoding actual payload', async () => {
    const payload = '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000141000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000007b00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b00000000000000000000000001010101010101010101010101010101010101010000000000000000000000000000000000000000000000000000000000000005';
    
    const decoded = await wrapper.decodeWithdrawEventData(payload);

    expect(decoded.sender_wid)
      .to.be.equal(0, 'Wrong sender wid');
    
    expect(decoded.sender_addr)
      .to.be.equal(0, 'Wrong sender address');
  });

  it('Check withdraw limit per period', async () => {
    expect(await vault.withdrawLimitPerPeriod())
        .to.be.equal(0, 'Wrong withdraw limit per period');
  });
});
