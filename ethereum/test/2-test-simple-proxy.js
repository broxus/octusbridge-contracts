const { expect } = require('chai');
const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const utils = require('./utils');

const Bridge = artifacts.require("Bridge");
const ProxySimple = artifacts.require("ProxySimple");


let bridge;
let proxySimple;


contract('Test simple proxy', async function(accounts) {
  before(async function() {
    const {
      address: admin,
    } = web3.eth.accounts.create();
  
    bridge = await deployProxy(
      Bridge,
      [accounts, admin],
    );
    
    proxySimple = await ProxySimple.new(bridge.address);
  });
  
  it('Test setting TON state', async function() {
  
  });
  
  it('Test callback', async function() {
  
  });
});
