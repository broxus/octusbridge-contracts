const {
  logger,
  expect,
  ...utils
} = require('../utils');

const { legos } = require('@studydefi/money-legos');


const tokensToLock = 1000;
const tokensToUnlock = 900;


describe('Unlock USDT with creating debt and fill order', async () => {
  let tokenLock, usdt;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    tokenLock = await ethers.getContract('TokenLock');
    
    usdt = await ethers.getContractAt(
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
        ['int8', 'uint256', 'uint128', 'uint160'],
        [0, 0, tokensToUnlock, utils.addressToU160(unlockReceiver)],
      );
      
      payload = utils.encodeTonEvent({
        eventData,
        proxy: tokenLock.address,
        chainId: 1,
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
      const { usdtOwner } = await getNamedAccounts();

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [usdtOwner]
      });

      locker = await ethers
        .provider
        .getSigner(usdtOwner);
    });

    it('Approve tokens to token lock', async () => {
      await usdt.connect(locker).approve(tokenLock.address, tokensToLock);
    });

    it('Lock tokens with filling unlock order', async () => {
      const {
        unlockReceiver
      } = await getNamedAccounts();
  
      await tokenLock
        .connect(locker)
        .lockTokens(tokensToLock, 0, 0, 0, [[unlockReceiver, 0]])
    });
    
    it('Check user received tokens', async () => {
      const {
        unlockReceiver
      } = await getNamedAccounts();

      expect(await usdt.balanceOf(unlockReceiver))
        .to.be.equal(tokensToUnlock, 'Wrong unlock receiver usdt balance after filling unlock');
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
        .to.be.equal(tokensToLock - tokensToUnlock, 'Wrong locked tokens');
    });
  });
});
