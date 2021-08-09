const {
  logger,
  expect,
  ...utils
} = require('../utils');

const { legos } = require('@studydefi/money-legos');


const tokensToLock = 1000;
const tokensToUnlock = 900;
const unlockFee = 100;


describe('Unlock USDT with creating debt and fill order', async () => {
  let tokenLock, token;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    tokenLock = await ethers.getContract('TokenLock_usdt');
    
    token = await ethers.getContractAt(
      legos.erc20.abi,
      '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    );
  });
  
  describe('Unlock more USDT than available', async () => {
    let payload, signatures;
    
    it('Prepare payload & signature', async () => {
      const initialRelays = utils.sortAccounts(await ethers.getSigners());
      
      const {
        unlockReceiver
      } = await getNamedAccounts();
  
      const eventData = web3.eth.abi.encodeParameters(
        ['int8', 'uint256', 'uint128', 'uint128','uint160', 'uint32'],
        [0, 0, tokensToUnlock, unlockFee, utils.addressToU160(unlockReceiver), utils.chainId],
      );
      
      payload = utils.encodeTonEvent({
        eventData,
        proxy: tokenLock.address,
        eventTransaction: 2,
      });
      
      signatures = await Promise.all(initialRelays
        .map(async (account) => utils.signReceipt(payload, account)));
    });
    
    it('Execute', async () => {
      await tokenLock.unlockTokens(payload, signatures);
    });
    
    it('Check debt', async () => {
      expect(await tokenLock.debtTokens())
        .to.be.equal(tokensToUnlock, 'Wrong debt tokens after second unlock');
    });
    
    it('Check tokens locked', async () => {
      expect(await tokenLock.lockedTokens())
        .to.be.equal(0, 'Wrong total locked tokens');
    });
  });
  
  describe('Lock tokens with filling unlock order', async () => {
    let locker;

    it('Setup locker', async () => {
      const tokenOwner = '0xA929022c9107643515F5c777cE9a910F0D1e490C';

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [tokenOwner]
      });

      locker = await ethers
        .provider
        .getSigner(tokenOwner);
    });

    it('Approve tokens to token lock', async () => {
      await token.connect(locker).approve(tokenLock.address, tokensToLock);
    });

    it('Lock tokens with filling unlock order', async () => {
      const {
        unlockReceiver
      } = await getNamedAccounts();
  
      await expect(tokenLock
        .connect(locker)
        .lockTokens(tokensToLock, 0, 0, 0, [[unlockReceiver, 0]])
      ).to.emit(tokenLock, 'TokenLock').withArgs(tokensToLock + unlockFee, 0, 0, 0);
    });
    
    it('Check user received tokens', async () => {
      const {
        unlockReceiver
      } = await getNamedAccounts();

      expect(await token.balanceOf(unlockReceiver))
        .to.be.equal(tokensToUnlock - unlockFee, 'Wrong receiver balance after filling order');
    });
    
    it('Check unlock order filled', async () => {
      const {
        unlockReceiver
      } = await getNamedAccounts();

      const unlockOrder = await tokenLock.getUnlockOrder(unlockReceiver, 0);
      
      expect(unlockOrder.filled)
        .to.be.equal(true, 'Unlock order should be marked as filled');
    });
    
    it('Check debt after filling unlock order', async () => {
      expect(await tokenLock.debtTokens())
        .to.be.equal(0, 'Wrong debt');
    });
    
    it('Check locked tokens', async () => {
      expect(await tokenLock.lockedTokens())
        .to.be.equal(tokensToLock - tokensToUnlock + unlockFee, 'Wrong locked tokens');
    });
  });
});
