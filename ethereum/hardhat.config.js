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
      url: 'https://goerli.infura.io/v3/2353043c705e4e0fa25a22689906eef4',
      accounts: {
        count: 10,
        initialIndex: 0,
        path: "m/44'/60'/0'/0",
        mnemonic: process.env.ETHEREUM_MNEMONIC
      },
      gasPrice: 100,
      chainId: 5,
    },
    main: {
      url: 'https://mainnet.infura.io/v3/2353043c705e4e0fa25a22689906eef4',
      accounts: [process.env.ETHEREUM_ACCOUNT],
      chainId: 1,
      gas: 2000000,
      gasPrice: 310000000000,
      timeout: 10000000,
    }
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 21
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  }
};
