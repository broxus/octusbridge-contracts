const {
  logger,
  expect,
  ...utils
} = require('../utils');

const { legos } = require('@studydefi/money-legos');

const tokensToLock = ethers.utils.parseEther("10.0"); // 10 Dai
const tokensToUnlock = ethers.utils.parseEther("1.0"); // 1 Dai

describe('Test Comp DAI token manager', async function() {
  this.timeout(20000000);

  let tokenLock, tokenManager, token, ctoken, locker;
  
  
  it('Setup contracts', async () => {
    await deployments.fixture();
  
    tokenLock = await ethers.getContract('TokenLock_dai');
    tokenManager = await ethers.getContract('CompFarmingTokenManager_dai');
  
    token = await ethers.getContractAt(
      legos.erc20.abi,
      (await tokenLock.token())
    );
    
    ctoken = await ethers.getContractAt(
      legos.compound.cDAI.abi,
      (await tokenManager.cToken())
    );
  });
  
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
  
  describe('Sync token manager position after lock', async () => {
    it('Lock tokens', async () => {
      await token
        .connect(locker)
        .approve(tokenLock.address, tokensToLock);
  
      await tokenLock
        .connect(locker)
        .lockTokens(tokensToLock, 0, 0, 0, []);
    });
    
    it('Check token lock locked tokens', async () => {
      const lockedTokens = await tokenLock.lockedTokens();

      expect(lockedTokens)
        .to.be.equal(tokensToLock, 'Wrong locked tokens after lock');
    });
    
    it('Check token lock debt tokens', async () => {
      const debtTokens = await tokenLock.debtTokens();
      
      expect(debtTokens)
        .to.be.equal(0, 'Wrong token debt after lock');
    });
    
    it('Check token manager status', async () => {
      const status = await tokenLock.getTokenManagerStatus(tokenManager.address);
      
      expect(status.status)
        .to.be.equal(2, 'Wrong status');
      
      // expect(status.tokens)
      //   .to.be.greaterThan(0, 'Too low token manager expected tokens')
      //   .to.be.lessThan(tokensToLock, 'Too high token manager expected tokens');
    });
    
    it('Sync token manager', async () => {
      await tokenManager.sync();
    });
    
    describe('Check token manager status', async () => {
      it('Check token manager locked tokens in token lock', async () => {
    
      });
  
      it('Check token manager status in token lock', async () => {
        const status = await tokenLock.getTokenManagerStatus(tokenManager.address);
        
        // expect(status.status)
        //   .to.be.equal(0, 'Wrong token manager status');
      });
      
      it('Check cToken balance', async () => {
        const balance = await ctoken.balanceOf(tokenManager.address);
        
        // console.log(balance);
        //
        // expect(balance)
        //   .to.be.greaterThan(0, 'Wrong ctoken token manager balance');
      });
      
      it('Check Compound status', async () => {
      
      });
    });
  });
  
  describe('Sync token manager after instantly-filled unlock', async () => {
    it('Unlock tokens', async () => {
      const {
        unlockReceiver
      } = await getNamedAccounts();
  
      const eventData = web3.eth.abi.encodeParameters(
        ['int8', 'uint256', 'uint128', 'uint128','uint160', 'uint32'],
        [0, 0, tokensToUnlock, 0, utils.addressToU160(unlockReceiver), utils.chainId],
      );
  
      const payload = utils.encodeTonEvent({
        eventData,
        proxy: tokenLock.address,
      });
  
      const initialRelays = utils.sortAccounts(await ethers.getSigners());
  
      const signatures = await Promise.all(initialRelays
        .map(async (account) => utils.signReceipt(payload, account)));
  
      await tokenLock.unlockTokens(payload, signatures);
  
      expect(await token.balanceOf(unlockReceiver))
        .to.be.equal(tokensToUnlock, 'Receiver did not receive tokens');
    });
  
    it('Check token manager status in token lock', async () => {
      const status = await tokenLock.getTokenManagerStatus(tokenManager.address);
    
      console.log(status);
      
      // expect(status.status)
      //   .to.be.equal(0, 'Wrong token manager status');
    });
  
    it('Sync token manager', async () => {
    
    });
    
    it('Check token manager balance', async () => {
    
    });
  });
  
  describe('Sync token manager after delayed unlock', async () => {
    it('Unlock too many tokens', async () => {
    
    });
    
    it('Sync token manager', async () => {
    
    });
    
    it('Check token manager balance', async () => {
    
    });
    
    it('Fill unlock order', async () => {
    
    });
  });
});
