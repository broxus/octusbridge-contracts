const { expect } = require('chai');
const utils = require('./utils');

const Bridge = artifacts.require("Bridge");
const ProxySimple = artifacts.require("ProxySimple");


let bridge;
let proxySimple;

contract('Test simple proxy', async function(accounts) {
  before(async function() {
    bridge = await Bridge.deployed();
    proxySimple = await ProxySimple.deployed();
  });
  
  it('Test setting TON state', async function() {
  
  });
  
  it('Test callback', async function() {
  
  });
});
