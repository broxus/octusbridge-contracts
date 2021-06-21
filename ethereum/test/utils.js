const ethers = require('ethers');
const logger = require('mocha-logger');

const chai = require('chai');
const { solidity } = require("ethereum-waffle");

chai.use(solidity);

const { expect } = chai;


const signReceipt = async (web3, receipt, signer) => {
  const receiptHash = web3
    .utils
    .soliditySha3(receipt)
    .toString('hex');
  
  const messageHashBytes = ethers.utils.arrayify(receiptHash);
  
  return signer.signMessage(messageHashBytes);
};


const sortAccounts = (accounts) => accounts
  .sort((a, b) => b.address.toLowerCase() > a.address.toLowerCase() ? -1 : 1);


module.exports = {
  signReceipt,
  logger,
  expect,
  sortAccounts
};
