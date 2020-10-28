const EthereumBridge = artifacts.require("EthereumBridge");
const EventContractExample = artifacts.require("EventContractExample");

const utils = require('./utils');
const assert = require('assert');

let ethereumBridge;
let eventContractExample;
let executeCallReceipt;

const eventCallABI = EventContractExample.abi.find(({ name }) => name === 'setState');
const eventCallReceipt = web3.eth.abi.encodeFunctionCall(eventCallABI, [1]);

contract('Testing Ethereum bridge call', async (accounts) => {
  before(async () => {
    ethereumBridge = await EthereumBridge.deployed();
    eventContractExample = await EventContractExample.deployed();
  
    executeCallReceipt = web3.eth.abi.encodeParameters(
      ['address', 'bytes', 'uint'],
      [eventContractExample.address, eventCallReceipt, 123],
    );
  });
  
  it('Unauthorized call', async () => {
    const requiredOwnersToExecuteCall = await ethereumBridge.requiredOwnersToExecuteCall();
    const initialStateEventContract = await eventContractExample.currentState();
    
    const signatures = await Promise
      .all(
        accounts
          .slice(0, requiredOwnersToExecuteCall - 1)
          .map(async (a) => utils.signReceipt(web3, executeCallReceipt, a))
      );
  
    await utils.catchRevert(
      ethereumBridge.executeTargetCall(
        executeCallReceipt,
        signatures,
      ),
    );
    
    assert.deepStrictEqual(
      initialStateEventContract,
      (await eventContractExample.currentState())
    );
  });
  
  it('Authorized call', async () => {
    const requiredOwnersToExecuteCall = await ethereumBridge.requiredOwnersToExecuteCall();

    const signatures = await Promise
      .all(
          accounts
          .slice(0, requiredOwnersToExecuteCall)
          .map(async (a) => utils.signReceipt(web3, executeCallReceipt, a))
      );
    
    await ethereumBridge.executeTargetCall(
      executeCallReceipt,
      signatures,
    );
  });
});
