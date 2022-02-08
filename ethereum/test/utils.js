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

const defaultEventTimestamp = 1639923130;

const signReceipt = async (receipt, signer) => {
  const receiptHash = web3
    .utils
    .soliditySha3(receipt)
    .toString('hex');
  
  const messageHashBytes = ethers.utils.arrayify(receiptHash);
  
  return signer.signMessage(messageHashBytes);
};


const deriveWithdrawalPeriodId = (timestamp) => {
  return Math.floor(timestamp / (60 * 60 * 24));
};


const sortAccounts = (accounts) => accounts
  .sort((a, b) => b.address.toLowerCase() > a.address.toLowerCase() ? -1 : 1);


const addressToU160 = (address) => (new BigNumber(address.toLowerCase())).toString(10);


const encodeEverscaleEvent = (params) => {
  return web3.eth.abi.encodeParameters(
    [{
      'EverscaleEvent': {
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
      'eventTimestamp': params.eventTimestamp || defaultEventTimestamp,
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
    'int8',
    'uint256',
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
    1,
    2,
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


const encodeWithdrawalData = (params) => {
  return web3.eth.abi.encodeParameters(
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
};


const getSignerFromAddr = async (address) => {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address]
  });

  return await ethers.provider.getSigner(address);
}

const increaseTime = async (time) => {
  await hre.network.provider.request({
    method: 'evm_increaseTime',
    params: [time]
  });
}

const mineBlocks = async (num) => {
  for (const i of Array.from(Array(num).keys())) {
    await hre.network.provider.request({method: 'evm_mine'});
  }
}

const issueTokens = async ({ token, owner, amount, recipient }) => {
  const locker = await getSignerFromAddr(owner);
  
  await token
    .connect(locker)
    .transfer(recipient, amount);
};


const getInitialRelays = async () => {
  const relay_keys = Object
    .keys(await getNamedAccounts())
    .filter(x => x.startsWith('relay_'));

  return Promise.all(relay_keys.map(async (k) => ethers.getNamedSigner(k)));
};


const getNetworkTime = async () => {
  const currentBlock = await ethers.provider.getBlockNumber();

  const currentTime = (await ethers.provider.getBlock(currentBlock)).timestamp;

  return currentTime;
};


const getPayloadSignatures = async (payload) => {
  const initialRelays = sortAccounts(await ethers.getSigners());

  return Promise.all(initialRelays.map(async (account) => signReceipt(payload, account)));
};


module.exports = {
  signReceipt,
  logger,
  expect,
  sortAccounts,
  encodeEverscaleEvent,
  encodeDaoActions,
  addressToU160,
  defaultChainId,
  defaultConfiguration,
  defaultEventContract,
  defaultTonRecipient,
  defaultEventTimestamp,
  generateWallets,
  getVaultByToken,
  getSignerFromAddr,
  encodeWithdrawalData,
  issueTokens,
  getInitialRelays,
  increaseTime,
  mineBlocks,
  getNetworkTime,
  deriveWithdrawalPeriodId,
  getPayloadSignatures,
};
