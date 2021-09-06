require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require('hardhat-deploy-ethers');
require('hardhat-deploy');
require("@nomiclabs/hardhat-vyper");
require('hardhat-abi-exporter');


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
  vyper: {
    version: "0.2.12",
  },
  solidity: {
    version: '0.8.0',
    settings: {
      optimizer: {
        enabled: true
      }
    }
  },
  networks: {
    hardhat: {
      // blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      forking: {
        url: process.env.ETH_MAIN_ARCHIVE_HTTP,
        blockNumber: 12859605,
      },
      chainId: 1111,
    },
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 21
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    guardian: {
      default: 1,
    },
    management: {
      default: 2,
    },
    owner: {
      default: 3,
    },
    alice: {
      default: 4,
    },
    bob: {
      default: 5,
    },
    eve: {
      default: 6,
    },
    stranger: {
      default: 7,
    },
    dai_owner: {
      default: '0xA929022c9107643515F5c777cE9a910F0D1e490C',
    },
  },
  abiExporter: {
    path: 'abi',
    clear: true,
    flat: true,
    spacing: 2
  }
};
