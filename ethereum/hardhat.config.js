require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require('hardhat-deploy-ethers');
require('hardhat-deploy');
require("@nomiclabs/hardhat-vyper");
require('hardhat-abi-exporter');
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
const hardhatConfig = {
  vyper: {
    version: "0.2.12",
  },
  solidity: {
    version: '0.8.2',
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
    goerli: {
      url: process.env.ETH_GOERLI_HTTP,
      gasPrice: 1500000007,
      gas: 3000000,
      timeout: 1000000,
      accounts: {
        mnemonic: process.env.ETH_GOERLI_MNEMONIC,
        count: 30
      },
    },
    // main: {
    //   url: process.env.ETH_MAIN_HTTP,
    //   gasPrice: 90000000000,
    //   gas: 3000000,
    //   timeout: 1000000,
    //   accounts: {
    //     mnemonic: process.env.ETH_GOERLI_MNEMONIC,
    //     count: 30
    //   },
    // },
    ropsten: {
      url: process.env.ETH_ROPSTEN_HTTP,
      gasPrice: 2500000007,
      gas: 3000000,
      timeout: 1000000,
      accounts: {
        mnemonic: process.env.ETH_GOERLI_MNEMONIC,
        count: 30
      },
    }
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 80,
    enabled: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  },
  namedAccounts: {
    deployer: {
      default: 0,
      goerli: 0,
    },
    guardian: {
      default: 1,
      goerli: 1,
    },
    management: {
      default: 2,
      goerli: 2,
    },
    owner: {
      default: 3,
      goerli: 3,
      main: '0xe29B04B9c6712080f79B2dAc5211B18B279D5DE0',
    },
    alice: {
      default: 4,
      goerli: 4,
    },
    bob: {
      default: 5,
      goerli: 5,
    },
    eve: {
      default: 6,
      goerli: 6,
    },
    stranger: {
      default: 7,
      goerli: 7,
    },
    roundSubmitter: {
      default: 8,
      ropsten: 8,
      goerli: 8,
    },
    dai_owner: {
      default: '0xA929022c9107643515F5c777cE9a910F0D1e490C',
    },
    relay_1: {
      default: 10,
      ropsten: '0x59861a7db8e01daf3763468325161e41bec59821',
      goerli: '0x59861a7db8e01daf3763468325161e41bec59821',
    },
    relay_2: {
      default: 11,
      ropsten: '0x440734bbacc1cfae9b5b16f14eb7423a1f069af0',
      goerli: '0x440734bbacc1cfae9b5b16f14eb7423a1f069af0',
    },
    relay_3: {
      default: 12,
      ropsten: '0x0fa6339155d9dd1fa7e4fd8feba84c675b5874ff',
      goerli: '0x0fa6339155d9dd1fa7e4fd8feba84c675b5874ff',
    },
    // relay_4: {
    //   default: 13,
    // },
    // relay_5: {
    //   default: 14,
    // },
    // relay_6: {
    //   default: 15,
    // },
    // relay_7: {
    //   default: 16,
    // },
    // relay_8: {
    //   default: 17,
    // },
    // relay_9: {
    //   default: 18,
    // },
    // relay_10: {
    //   default: 19,
    // },
    // relay_11: {
    //   default: 20,
    // },
    // relay_12: {
    //   default: 21,
    // },
    // relay_13: {
    //   default: 22,
    // },
  },
  abiExporter: {
    path: 'abi',
    clear: true,
    flat: true,
    spacing: 2
  }
};

module.exports = hardhatConfig;
