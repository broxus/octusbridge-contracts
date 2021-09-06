// const ethers = require('ethers');
const logger = require('mocha-logger');
const BigNumber = require('bignumber.js');
const _ = require('underscore');

const chai = require('chai');
const { solidity } = require("ethereum-waffle");

chai.use(solidity);
// chai.use(require('chai-bignumber')());

const { expect } = chai;

const defaultChainId = 1111;

const defaultConfiguration = {
  wid: 0,
  addr: 123456789
};

const defaultEventContract = {
  wid: 0,
  addr: 22222222,
};

const defaultTonRecipient = {
  wid: 0,
  addr: 33333333,
};

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


const addressToU160 = (address) => (new BigNumber(address.toLowerCase())).toString(10);


const encodeTonEvent = (params) => {
  return web3.eth.abi.encodeParameters(
    [{
      'TONEvent': {
        'eventTransactionLt': 'uint64',
        'eventTimestamp': 'uint32',
        'eventData': 'bytes',
        'configurationWid': 'int8',
        'configurationAddress': 'uint256',
        'eventContractWid': 'int8',
        'eventContractAddress': 'uint256',
        'proxy': 'address',
        'round': 'uint32',
      }
    }],
    [{
      'eventTransactionLt': params.eventTransactionLt || 0,
      'eventTimestamp': params.eventTimestamp || 0,
      'eventData': params.eventData || '',
      'configurationWid': params.configurationWid || defaultConfiguration.wid,
      'configurationAddress': params.configurationAddress || defaultConfiguration.addr,
      'eventContractWid': params.eventContractWid || defaultEventContract.wid,
      'eventContractAddress': params.eventContractAddress || defaultEventContract.addr,
      'proxy': params.proxy || ethers.constants.AddressZero,
      'round': params.round || 0,
    }]
  );
};


const encodeDaoActions = (actions, chainId=defaultChainId) => web3.eth.abi.encodeParameters(
  [
    'uint32',
    {
      'EthAction[]': {
        'value': 'uint256',
        'target': 'uint160',
        'signature': 'string',
        'data': 'bytes'
      }
    }
  ],
  [
    chainId,
    actions.map(action => new Object({
      'value': action.value || 0,
      'target': (new BigNumber(action.target.toLowerCase())).toString(10),
      'signature': action.signature || '',
      'data': action.data || ''
    }))
  ]
);


const generateWallets = async (amount) => Promise.all(_
  .range(amount)
  .map(async () => ethers.Wallet.createRandom())
);


const getVaultByToken = async (registry, token) => {
  const filter = registry.filters.NewVault(token, null);
  
  const [{
    args: {
      vault: _vault
    }
  }] = await registry.queryFilter(filter, 0, "latest");
  
  return ethers.getContractAt('Vault', _vault);
};


const encodeWithdrawalData = (params) => web3.eth.abi.encodeParameters(
  // sender wid, sender addr, amount, recipient, chainId
  ['int8', 'uint256', 'uint128', 'uint160', 'uint32'],
  [
    params.sender_wid || 0,
    params.sender_addr || 0,
    params.amount || 0,
    params.recipient || ethers.constants.AddressZero,
    params.chainId || defaultChainId,
  ]
);


const issueTokens = async ({ token, owner, amount, recipient }) => {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [owner]
  });
  
  const locker = await ethers
    .provider
    .getSigner(owner);
  
  await token
    .connect(locker)
    .transfer(recipient, amount);
};


module.exports = {
  signReceipt,
  logger,
  expect,
  sortAccounts,
  encodeTonEvent,
  encodeDaoActions,
  addressToU160,
  defaultChainId,
  defaultConfiguration,
  defaultEventContract,
  defaultTonRecipient,
  generateWallets,
  getVaultByToken,
  encodeWithdrawalData,
  issueTokens,
};
