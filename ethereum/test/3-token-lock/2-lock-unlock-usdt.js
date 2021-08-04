const {
  logger,
  expect,
  ...utils
} = require('../utils');

const { legos } = require('@studydefi/money-legos');


const tokensToLock = 1000;
const tokensToUnlock = 900;
const unlockFee = 100;


describe('Lock and unlock USDT', async () => {
  let tokenLock, usdt, locker;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    tokenLock = await ethers.getContract('TokenLock');

    usdt = await ethers.getContractAt(
      legos.erc20.abi,
      '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    );
  });
  
  describe('Lock USDT', async () => {
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

    it('Lock tokens', async () => {
      await expect(() => tokenLock.connect(locker).lockTokens(tokensToLock, 0, 0, 0, [], []))
        .to.changeTokenBalance(usdt, tokenLock, tokensToLock);
    });
    
    it('Check total locked', async () => {
      expect(await tokenLock.lockedTokens())
        .to.be.equal(tokensToLock, 'Wrong locked tokens');
    });
  });
  
  describe('Unlock USDT', async () => {
    let payload, signatures;

    it('Prepare payload & signatures', async () => {
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
      });
  
      const initialRelays = utils.sortAccounts(await ethers.getSigners());
      
      signatures = await Promise.all(initialRelays
        .map(async (account) => utils.signReceipt(payload, account)));
    });
    
    it('Execute', async () => {
      const {
        unlockReceiver
      } = await getNamedAccounts();

      await tokenLock.unlockTokens(payload, signatures);
      
      expect(await usdt.balanceOf(unlockReceiver))
        .to.be.equal(tokensToUnlock, 'Receiver did not receive tokens');
    });
    
    it('Check locked tokens', async () => {
      expect(await tokenLock.lockedTokens())
        .to.be.equal(tokensToLock - tokensToUnlock, 'Wrong locked tokens after unlock');
    });
    
    it('Check debt', async () => {
      expect(await tokenLock.debtTokens())
        .to.be.equal(0, 'Wrong debt tokens after unlock');
    });
    
    it('Check receiver unlock orders', async () => {
      const {
        unlockReceiver
      } = await getNamedAccounts();

      const unlockOrders = await tokenLock.getUnlockOrders(unlockReceiver);
      
      expect(unlockOrders)
        .to.have.lengthOf(1, 'Wrong amount of unlock orders');
      
      expect(unlockOrders[0].filled)
        .to.be.equal(true, 'Order should be filled');
      
      expect(unlockOrders[0].amount)
        .to.be.equal(tokensToUnlock, 'Wrong order amount');
      
      expect(unlockOrders[0].fee)
        .to.be.equal(unlockFee, 'Wrong order fee');
    });
    
    it('Try to reuse payload', async () => {
      expect(tokenLock.unlockTokens(payload, signatures))
        .to.be.revertedWith('Cache: payload already seen');
    });
  });
});
