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

  });
  
  it('Unauthorized call', async () => {
  
  });
  
  it('Authorized call', async () => {
  
  });
});
