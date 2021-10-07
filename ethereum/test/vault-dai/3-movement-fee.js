const { legos } = require('@studydefi/money-legos');
const {
  expect,
  defaultConfiguration,
  defaultTonRecipient,
  getVaultByToken,
  generateWallets,
  encodeTonEvent,
  encodeWithdrawalData,
  ...utils
} = require('../utils');

// 10000 BPS
const DEPOSIT_FEE = [2, 10];
const WITHDRAW_FEE = [2, 50];


describe('Check deposit / withdraw fees', async () => {
  let vault, wrapper, dai;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    dai = await ethers.getContractAt(
      legos.erc20.abi,
      legos.erc20.dai.address,
    );
  });
  
  it('Create vault', async () => {
    const owner = await ethers.getNamedSigner('owner');
    const { guardian } = await getNamedAccounts();
    
    const registry = await ethers.getContract('Registry');
    
    await registry.connect(owner).newVault(
      dai.address,
      guardian,
      legos.erc20.dai.decimals,
      0,
      0,
    );
    
    vault = await getVaultByToken(registry, dai.address);
    
    wrapper = await ethers.getContractAt(
      'VaultWrapper',
      (await vault.wrapper())
    );
  });

  describe('Check deposit fee', async () => {
    it('Set non-zero deposit fee', async () => {
      const owner = await ethers.getNamedSigner('owner');

      await vault
        .connect(owner)
        .setDepositFee(DEPOSIT_FEE);
    });

    it('Check deposit fee', async () => {
    
    });
    
    it('Make deposit more than fee step', async () => {
    
    });
    
    it('Check deposit fee is considered on the FreeTON side', async () => {
    
    });
  });
  
  describe('Check withdraw fee', async () => {
    it('Set non-zero withdraw fee', async () => {
      // await vault.
    });
    
    it('Check withdraw fee', async () => {
    
    });
    
    it('Make withdraw more than fee step', async () => {
    
    });
    
    it('Check deposit fee is considered on the FreeTON side', async () => {
    
    });
  });
});
