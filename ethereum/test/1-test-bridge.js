const { expect } = require('chai');
const utils = require('./utils');

const Bridge = artifacts.require("Bridge");

let bridge;


contract('Testing Ethereum bridge', async function(accounts) {
  before(async function() {
    bridge = await Bridge.deployed();
  });
  
  it('Check relay signature valid', async function() {
    const receipt = '0x121212';
    const signature = await utils.signReceipt(web3, receipt, accounts[0]);
    
    expect((await bridge.countRelaysSignatures(receipt, [signature])).toNumber())
      .to.equal(1, "Relay signature dont work");
  });
});
