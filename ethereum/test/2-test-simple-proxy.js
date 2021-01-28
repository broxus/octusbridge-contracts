const { expect } = require('chai');
const utils = require('./utils');

const Bridge = artifacts.require("Bridge");

let bridge;


contract('Test simple proxy', async function(accounts) {
  before(async function() {
    bridge = await Bridge.deployed();
  });
  
  it('Test setting TON state', async function() {
  
  });
  
  it('Test callback', async function() {
  
  });
});
