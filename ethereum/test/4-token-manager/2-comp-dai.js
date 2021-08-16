const {
  logger,
  expect,
  ...utils
} = require('./../utils');

const { legos } = require('@studydefi/money-legos');
const BigNumber = require('bignumber.js');

const tokensToLock = ethers.utils.parseEther("10.0"); // 10 Dai

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
  
  it('Lock tokens', async () => {
    await token
      .connect(locker)
      .approve(tokenLock.address, tokensToLock);
    
    await tokenLock
      .connect(locker)
      .lockTokens(tokensToLock, 0, 0, 0, []);
  });
  
  describe('Sync token manager position after lock', async () => {
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
      
      // expect(status.tokens.toString())
      //   .to.be.greaterThan(0, 'Too low token manager expected tokens')
      //   .to.be.lessThan(tokensToLock, 'Too high token manager expected tokens');
    });
    
    it('Sync token manager', async () => {
      await tokenManager.sync();
    });
  
    it('Check token manager delegated tokens in token lock', async () => {
      const delegated = await tokenLock.tokenManagerDelegated(tokenManager.address);

      expect(delegated)
        .to.be.gte(0, 'Too low delegated tokens');
    });
  
    it('Check token manager status in token lock', async () => {
      const status = await tokenLock.getTokenManagerStatus(tokenManager.address);
  
      expect(status.status)
        .to.be.equal(0, 'Wrong token manager status');
      expect(status.tokens)
        .to.be.equal(0, 'Wrong token manager status tokens');
    });
  
    it('Check cToken balance', async () => {
      const balance = await ctoken.balanceOf(tokenManager.address);
      
      expect(balance)
        .to.be.gte(0, 'Wrong ctoken token manager balance');
    });
  
    it('Check Compound status', async () => {
    
    });
  });
  
  describe('Sync token manager after instantly-filled unlock', async () => {
    const tokensToUnlock = ethers.utils.parseEther("1.0"); // 1 Dai

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

      expect(status.status)
        .to.be.equal(1, 'Wrong token manager status');
      
      expect(status.tokens)
        .to.be.gte(0, 'Wrong token manager status tokens');
    });
    
    it('Sync token manager', async () => {
      await tokenManager.sync();
    });

    it('Check token manager status', async () => {
      const status = await tokenLock.getTokenManagerStatus(tokenManager.address);
  
      expect(status.status)
        .to.be.equal(0, 'Wrong token manager status');
  
      expect(status.tokens)
        .to.be.equal(0, 'Wrong token manager status tokens');
    });
  });

  describe('Sync token manager after delayed unlock less than total locked', async () => {
    const tokensToUnlock = ethers.utils.parseEther("8.0"); // 8 Dai

    it('Unlock tokens less than locked on token lock but more than available', async () => {
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
    });
    
    it('Check unlock order exists but not filled', async () => {
      const {
        unlockReceiver
      } = await getNamedAccounts();

      const order = await tokenLock.getUnlockOrder(unlockReceiver, 1);
      
      expect(order.filled)
        .to.be.equal(false, 'Unlock order should not be instantly filled');
    });

    it('Try to fill unlock order', async () => {
      const {
        unlockReceiver
      } = await getNamedAccounts();

      expect(tokenLock.fillUnlockOrder(unlockReceiver, 1))
        .to.be.revertedWith('Token lock: not enough tokens for filling order');
    });

    it('Get token manager status', async () => {
      const status = await tokenLock.getTokenManagerStatus(tokenManager.address);
      const delegated = await tokenLock.tokenManagerDelegated(tokenManager.address);
      
      expect(status.status)
        .to.be.equal(1, 'Wrong status');
      expect(status.tokens)
        .to.be.gt(0, 'Too low token manager status tokens');
      expect(delegated)
        .to.be.gt(status.tokens, 'Should be more delegated tokens than debt');
    });
    
    it('Sync token manager', async () => {
      await tokenManager.sync();
    });

    it('Check token manager status', async () => {
      const status = await tokenLock.getTokenManagerStatus(tokenManager.address);
  
      expect(status.status)
        .to.be.equal(0, 'Wrong token manager status');
  
      expect(status.tokens)
        .to.be.equal(0, 'Wrong token manager status tokens');
    });

    it('Fill unlock order', async () => {
      const {
        unlockReceiver
      } = await getNamedAccounts();

      await tokenLock.fillUnlockOrder(unlockReceiver, 1);
    });
  });

  // describe('Sync token manager after delayed unlock more than total locked', async () => {
  //   it('Unlock tokens more than available', async () => {
  //
  //   });
  //
  //   it('Sync token manager', async () => {
  //
  //   });
  //
  //   it('Check token manager balance', async () => {
  //
  //   });
  // });
});
