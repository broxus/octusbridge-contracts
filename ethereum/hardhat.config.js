require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");


task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();
  
  for (const account of accounts) {
    console.log(account.address);
  }
});


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: '0.7.3',
    settings: {
      optimizer: {
        enabled: true
      }
    }
  },
  networks: {
    hardhat: {},
    goerli: {
      url: 'https://goerli.infura.io/v3/a0eccb2cb9314ef3b468ff491c7ba5f0',
      accounts: {
        count: 10,
        initialIndex: 0,
        path: "m/44'/60'/0'/0",
        mnemonic: 'illness another yellow angle magic wall govern deputy cost coral weasel winner'
      },
      gasPrice: 100,
      chainId: 5,
    },
    main: {
      url: 'https://mainnet.infura.io/v3/0a02e928bc4840ce9ce60be57eaff3c1',
      accounts: ['0x1012ba86737026e8cfaefd316e52b41ca95faa2a49bd4f344571e3d1fe131d47'],
      chainId: 1,
      gas: 2000000,
      gasPrice: 210000000000,
      timeout: 10000000,
    }
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 21
  },
  etherscan: {
    apiKey: 'PGNQA9KET6WJYGB5TX4PSTMBCJ16QYG5JJ'
  }
};
