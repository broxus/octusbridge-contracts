const { expect } = require('chai');
const logger = require('mocha-logger');
const BigNumber = require('bignumber.js');
const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const utils = require('./utils');

const Bridge = artifacts.require("Bridge");
const ProxyTokenLock = artifacts.require("ProxyTokenLock");
const TestToken = artifacts.require("TestToken");

let bridge;
let proxyTokenLock;
let testToken;


const tokensToLock = 90000;
const tokensToUnlock = 80000;

contract('Test token proxy', async function(accounts) {
  before(async function() {
    const {
      address: admin,
    } = web3.eth.accounts.create();
  
    bridge = await deployProxy(
      Bridge,
      [accounts, admin],
    );

    testToken = await TestToken.new();

    proxyTokenLock = await deployProxy(
      ProxyTokenLock,
      [{
        token: testToken.address,
        bridge: bridge.address,
        active: true,
        requiredConfirmations: 2,
        fee: {
          numerator: 1,
          denominator: 100,
        }
      }, admin],
    );
  });
  
  describe('Test lock tokens', async function() {
    it('Approve tokens', async function() {
      await testToken.approve.sendTransaction(proxyTokenLock.address, tokensToLock);
      
      expect((await testToken.allowance.call(accounts[0], proxyTokenLock.address)).toNumber())
        .to
        .equal(tokensToLock, 'Wrong proxy token allowance');
    });
  
    it('Lock tokens', async function() {
      await proxyTokenLock.lockTokens.sendTransaction(tokensToLock, 0, 123, 123);
      
      expect((await testToken.balanceOf.call(proxyTokenLock.address)).toNumber())
        .to
        .equal(tokensToLock, 'Wrong proxy token balance');
    });
  });
  
  describe('Test unlock tokens', async function() {
    it('Unlock tokens', async function() {
      const receiver = '0xdF5ba068d01701c94663504095d492CB7bf64dA1';

      // Encode (ton address, ) event data
      const eventData = web3.eth.abi.encodeParameters(
        ['int8', 'uint256', 'uint128', 'uint160'],
        [0, 123, tokensToUnlock, BigNumber(receiver.toLowerCase())],
      );
      
      logger.log(`Event data: ${eventData}`);

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
      
      logger.log(`TON event: ${tonEvent}`);
      
      // Sign ton event
      const signatures = [
        (await utils.signReceipt(web3, tonEvent, accounts[0])),
        (await utils.signReceipt(web3, tonEvent, accounts[1]))
      ];
      
      expect((await testToken.balanceOf.call(receiver)).toNumber())
        .to
        .equal(0, 'Receiver balance should be zero before unlock');
      
      const feeAmount = (await proxyTokenLock.getFeeAmount.call(tokensToUnlock)).toNumber();
      
      logger.log(`Fee amount: ${feeAmount} (Ratio ${feeAmount / tokensToUnlock})`);
      
      await proxyTokenLock.broxusBridgeCallback.sendTransaction(
        tonEvent,
        signatures
      );
  
      expect((await testToken.balanceOf.call(receiver)).toNumber())
        .to
        .equal(tokensToUnlock - feeAmount, 'Receiver balance should be zero before unlock');
      
      expect((await testToken.balanceOf.call(proxyTokenLock.address)).toNumber())
        .to
        .equal(tokensToLock - tokensToUnlock + feeAmount, 'Token proxy balance should be non zero because of fee');
    });
  });
});
