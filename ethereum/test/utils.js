const ethers = require('ethers');
const logger = require('mocha-logger');

const chai = require('chai');
const { solidity } = require("ethereum-waffle");

chai.use(solidity);

const { expect } = chai;


const signReceipt = async (receipt, signer) => {
  const receiptHash = web3
    .utils
    .soliditySha3(receipt)
    .toString('hex');
  
  const messageHashBytes = ethers.utils.arrayify(receiptHash);
  
  return signer.signMessage(messageHashBytes);
};


const sortAccounts = (accounts) => accounts
  .sort((a, b) => b.address.toLowerCase() > a.address.toLowerCase() ? -1 : 1);


const encodeTonEvent = (params) => {
  return web3.eth.abi.encodeParameters(
    [{
      'TONEvent': {
        'eventTransaction': 'uint256',
        'eventTransactionLt': 'uint64',
        'eventTimestamp': 'uint32',
        'eventIndex': 'uint32',
        'eventData': 'bytes',
        'configurationWid': 'int8',
        'configurationAddress': 'uint256',
        'proxy': 'address',
        'round': 'uint32',
        'chainId': 'uint32',
      }
    }],
    [{
      'eventTransaction': params.eventTransaction || 0,
      'eventTransactionLt': params.eventTransactionLt || 0,
      'eventTimestamp': params.eventTimestamp || 0,
      'eventIndex': params.eventIndex || 0,
      'eventData': params.eventData || '',
      'configurationWid': params.configurationWid || 0,
      'configurationAddress': params.configurationAddress || 0,
      'proxy': params.proxy || '0x0000000000000000000000000000000000000000',
      'round': params.round || 0,
      'chainId': params.chainId || 1,
    }]
  );
};


module.exports = {
  signReceipt,
  logger,
  expect,
  sortAccounts,
  encodeTonEvent
};
