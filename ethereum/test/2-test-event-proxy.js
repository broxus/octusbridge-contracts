const EthereumBridge = artifacts.require("EthereumBridge");

const utils = require('./utils');
const assert = require('assert');

let ethereumBridge;

contract('Testing Ethereum bridge ownable', async (accounts) => {
  before(async () => {
    ethereumBridge = await EthereumBridge.deployed();
  });
  
  describe('Update owners set', async () => {
    it('Unauthorized', async () => {
    
    });

    it('Authorized', async () => {
    
    });
  });
});
