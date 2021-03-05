const { expect } = require('chai');
const BigNumber = require('bignumber.js');
const utils = require('./utils');

let accounts;
let bridge;
let proxyTokenLock;
let testToken;


const tokensToLock = 90000;
const tokensToUnlock = 80000;

describe('Test token lock proxy', async function() {
  before(async function() {
    accounts = await ethers.getSigners();
  
    const Bridge = await ethers.getContractFactory("Bridge");
    bridge = await upgrades.deployProxy(
      Bridge,
      [
        accounts.map(a => a.address),
        accounts[0].address,
        [1, 2]
      ]
    );
  
    const TestToken = await ethers.getContractFactory('TestToken');
    testToken = await TestToken.deploy();
    
    const ProxyTokenLock = await ethers.getContractFactory('ProxyTokenLock');
    proxyTokenLock = await upgrades.deployProxy(
      ProxyTokenLock,
      [
        [
          testToken.address,
          bridge.address,
          true,
          2,
          [1, 100]
        ],
        accounts[0].address
      ],
    );
  });
  
  describe('Test locking tokens', async function() {
    it('Approve tokens', async function() {
      await testToken.approve(proxyTokenLock.address, tokensToLock);

      expect(
        (await testToken.allowance(accounts[0].address, proxyTokenLock.address)).toNumber()
      ).to.equal(tokensToLock, 'Wrong proxy token allowance');
    });

    it('Lock tokens', async function() {
      await proxyTokenLock.lockTokens(tokensToLock, 0, 123, 123);

      expect(
        (await testToken.balanceOf(proxyTokenLock.address)).toNumber()
      ).to.equal(tokensToLock, 'Wrong proxy token balance');
    });
  });

  describe('Test unlocking tokens', async function() {
    it('Unlock tokens', async function() {
      const receiver = '0xdF5ba068d01701c94663504095d492CB7bf64dA1';

      // Encode (ton address, ) event data
      const eventData = web3.eth.abi.encodeParameters(
        ['int8', 'uint256', 'uint128', 'uint160'],
        [0, 123, tokensToUnlock, BigNumber(receiver.toLowerCase())],
      );

      // logger.log(`Event data: ${eventData}`);

      // Encode TONEvent structure
      const tonEvent = web3.eth.abi.encodeParameters(
        [{
          'TONEvent': {
            'eventTransaction': 'uint256',
            'eventTransactionLt': 'uint64',
            'eventTimestamp': 'uint32',
            'eventIndex': 'uint32',
            'eventData': 'bytes',
            'tonEventConfigurationWid': 'int8',
            'tonEventConfigurationAddress': 'uint',
            'requiredConfirmations': 'uint16',
            'requiredRejects': 'uint16',
          }
        }],
        [{
          'eventTransaction': 0,
          'eventTransactionLt': 0,
          'eventTimestamp': 0,
          'eventIndex': 0,
          'eventData': eventData,
          'tonEventConfigurationWid': 0,
          'tonEventConfigurationAddress': 0,
          'requiredConfirmations': 1,
          'requiredRejects': 1,
        }]
      );
      
      // Sign ton event
      const signatures = [
        (await utils.signReceipt(web3, tonEvent, accounts[0].address)),
        (await utils.signReceipt(web3, tonEvent, accounts[1].address))
      ];

      expect(
        (await testToken.balanceOf(receiver)).toNumber()
      ).to.equal(0, 'Receiver balance should be zero before unlock');

      const feeAmount = (await proxyTokenLock.getFeeAmount(tokensToUnlock)).toNumber();

      // logger.log(`Fee amount: ${feeAmount} (Ratio ${feeAmount / tokensToUnlock})`);

      await proxyTokenLock.broxusBridgeCallback(
        tonEvent,
        signatures
      );

      expect(
        (await testToken.balanceOf(receiver)).toNumber()
      ).to.equal(
        tokensToUnlock - feeAmount,
        'Receiver balance should be zero before unlock'
      );

      expect(
        (await testToken.balanceOf(proxyTokenLock.address)).toNumber()
      ).to.equal(
        tokensToLock - tokensToUnlock + feeAmount,
        'Token proxy balance should be non zero because of fee'
      );
    });
  });
  
  describe('Test admin red button', async function() {
    const transferPayload = web3.eth.abi.encodeFunctionCall({
      name: 'transfer',
      type: 'function',
      inputs: [{
        type: 'address',
        name: 'recipient'
      },{
        type: 'uint256',
        name: 'amount'
      }]
    }, ['0x8b24Eb4E6aAe906058242D83e51fB077370c4720', 123]);
    
    it('Try to call red button with non-admin', async function() {
      await utils.catchRevertWithMessage(
        proxyTokenLock.connect(accounts[1]).externalCallEth([testToken.address], [transferPayload], [0]),
        'Sender not admin',
      );
    });
    
    it('Withdraw tokens with red-button', async function() {
      await proxyTokenLock.externalCallEth([testToken.address], [transferPayload], [0]);
  
      expect(
        (await testToken.balanceOf('0x8b24Eb4E6aAe906058242D83e51fB077370c4720')).toNumber()
      ).to.equal(123, 'Address should receive tokens');
    });
  });
  
  describe('Test admin ownership transfer', async function() {
    it('Try to transfer ownership with non-admin', async function() {
      await utils.catchRevertWithMessage(
        proxyTokenLock.connect(accounts[1]).transferAdmin(accounts[1].address),
        'Sender not admin',
      );
    });
    
    it('Transfer admin ownership', async function() {
    
    });
  });
  
  describe('Test configuration update', async function() {
    it('Try to update configuration with non-owner', async function() {
      // await utils.catchRevertWithMessage(
      //   proxyTokenLock.connect(accounts[1]).transferAdmin(accounts[1].address),
      //   'Sender not admin',
      // );
      //
    });
    
    it('Update configuration', async function() {
    
    });
  });
});
