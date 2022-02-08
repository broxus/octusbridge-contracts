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


console.log(process.env.COINMARKETCAP_API_KEY);


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const hardhatConfig = {
  solidity: {
    version: '0.8.2',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ETH_MAIN_ARCHIVE_HTTP,
        blockNumber: 12859605,
      },
      chainId: 1111,
      accounts: {
        count: 30
      }
    },
    polygon: {
      url: 'https://matic-mainnet.chainstacklabs.com',
      gasPrice: 1001000000, // 1.001 gwei
      gas: 3000000,
      timeout: 1000000,
      // accounts: {
      //   mnemonic: process.env.ETH_MNEMONIC,
      //   count: 30
      // },
    },
  //   bsc: {
  //     url: 'https://bsc-dataseed.binance.org/',
  //     gasPrice: 5000000000, // 5 gwei
  //     gas: 3000000,
  //     timeout: 1000000,
  //     accounts: {
  //       mnemonic: process.env.ETH_MNEMONIC,
  //       count: 30
  //     },
  //   },
  //   fantom: {
  //     url: 'https://rpc.ftm.tools/',
  //     gasPrice: 550000000000, // 550 gwei
  //     gas: 3000000,
  //     timeout: 1000000,
  //     accounts: {
  //       mnemonic: process.env.ETH_MNEMONIC,
  //       count: 30
  //     },
  //   },
  //   // goerli: {
  //   //   url: process.env.ETH_GOERLI_HTTP,
  //   //   gasPrice: 1500000007,
  //   //   gas: 3000000,
  //   //   timeout: 1000000,
  //   //   accounts: {
  //   //     mnemonic: process.env.ETH_GOERLI_MNEMONIC,
  //   //     count: 30
  //   //   },
  //   // },
  //   // main: {
  //   //   url: process.env.ETH_MAIN_HTTP,
  //   //   gasPrice: 110000000000, // 110 gwei
  //   //   gas: 3000000,
  //   //   timeout: 1000000,
  //   //   accounts: {
  //   //     mnemonic: process.env.ETH_MNEMONIC,
  //   //     count: 30
  //   //   },
  //   // },
  //   // ropsten: {
  //   //   url: process.env.ETH_ROPSTEN_HTTP,
  //   //   gasPrice: 2500000007,
  //   //   gas: 3000000,
  //   //   timeout: 1000000,
  //   //   accounts: {
  //   //     mnemonic: process.env.ETH_GOERLI_MNEMONIC,
  //   //     count: 30
  //   //   },
  //   // }
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 100,
    enabled: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    outputFile: 'gas-report.txt'
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  },
  namedAccounts: {
    dai_vault: {
      hardhat: '0x687D0fa2c74a2DDFbdA08da2eF494b64A967b7fa'
    },
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
      polygon: '0xB8dD7223edc08A1681c81278D31d644576ECF0b4',
      bsc: '0xbF13DBbf86B6B1cc02a4169Dde38E16862C77a0a',
      fantom: '0x5B2329A2b2B5ec2f5F77afb6826F825dcec3A3Fd',
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
    roundSubmitter: {
      default: 8,
      ropsten: 8,
      goerli: 8,
      polygon: '0xB8dD7223edc08A1681c81278D31d644576ECF0b4',
      bsc: '0xbF13DBbf86B6B1cc02a4169Dde38E16862C77a0a',
      fantom: '0x5B2329A2b2B5ec2f5F77afb6826F825dcec3A3Fd',
    },
    dai_owner: {
      default: '0xA929022c9107643515F5c777cE9a910F0D1e490C',
    },
    relay_1: {
      default: 10,
      ropsten: '0x59861a7db8e01daf3763468325161e41bec59821',
      goerli: '0x59861a7db8e01daf3763468325161e41bec59821',
      main: '0xafa0109c95bffabb215a0ea378edc96562e4b783',
      polygon: '0xafa0109c95bffabb215a0ea378edc96562e4b783',
      bsc: '0xafa0109c95bffabb215a0ea378edc96562e4b783',
      fantom: '0xafa0109c95bffabb215a0ea378edc96562e4b783',
    },
    relay_2: {
      default: 11,
      ropsten: '0x440734bbacc1cfae9b5b16f14eb7423a1f069af0',
      goerli: '0x440734bbacc1cfae9b5b16f14eb7423a1f069af0',
      main: '0xec1218e93aaa54d649f3a6eb90443b6139bb9fd4',
      polygon: '0xec1218e93aaa54d649f3a6eb90443b6139bb9fd4',
      bsc: '0xec1218e93aaa54d649f3a6eb90443b6139bb9fd4',
      fantom: '0xec1218e93aaa54d649f3a6eb90443b6139bb9fd4',
    },
    relay_3: {
      default: 12,
      ropsten: '0x0fa6339155d9dd1fa7e4fd8feba84c675b5874ff',
      goerli: '0x0fa6339155d9dd1fa7e4fd8feba84c675b5874ff',
      main: '0xf81ad5df888140915aaa2d636a948f5f32ae7113',
      polygon: '0xf81ad5df888140915aaa2d636a948f5f32ae7113',
      bsc: '0xf81ad5df888140915aaa2d636a948f5f32ae7113',
      fantom: '0xf81ad5df888140915aaa2d636a948f5f32ae7113',
    },
    relay_4: {
      default: 13,
      main: '0x4cf29ad4faeb5191003bafced4457091423f892b',
      polygon: '0x4cf29ad4faeb5191003bafced4457091423f892b',
      bsc: '0x4cf29ad4faeb5191003bafced4457091423f892b',
      fantom: '0x4cf29ad4faeb5191003bafced4457091423f892b',
    },
    relay_5: {
      default: 14,
      main: '0xcc9f29245465c7941707cc206568bfd9ce3ecf49',
      polygon: '0xcc9f29245465c7941707cc206568bfd9ce3ecf49',
      bsc: '0xcc9f29245465c7941707cc206568bfd9ce3ecf49',
      fantom: '0xcc9f29245465c7941707cc206568bfd9ce3ecf49',
    },
    relay_6: {
      default: 15,
      main: '0x1a88767a059946c9ed07d5e3fccca7d46d9f8bf0',
      polygon: '0x1a88767a059946c9ed07d5e3fccca7d46d9f8bf0',
      bsc: '0x1a88767a059946c9ed07d5e3fccca7d46d9f8bf0',
      fantom: '0x1a88767a059946c9ed07d5e3fccca7d46d9f8bf0',
    },
    relay_7: {
      default: 16,
      main: '0xb978ad11da94ad99d9a17b2c5a2de71aad2c8ac8',
      polygon: '0xb978ad11da94ad99d9a17b2c5a2de71aad2c8ac8',
      bsc: '0xb978ad11da94ad99d9a17b2c5a2de71aad2c8ac8',
      fantom: '0xb978ad11da94ad99d9a17b2c5a2de71aad2c8ac8',
    },
    relay_8: {
      default: 17,
      main: '0x16532b04d536fdc7e2afe75dd95b65951dee820a',
      polygon: '0x16532b04d536fdc7e2afe75dd95b65951dee820a',
      bsc: '0x16532b04d536fdc7e2afe75dd95b65951dee820a',
      fantom: '0x16532b04d536fdc7e2afe75dd95b65951dee820a',
    },
    relay_9: {
      default: 18,
      main: '0x3eb41a0198fcb8fc68097ebade34c61847e8c03c',
      polygon: '0x3eb41a0198fcb8fc68097ebade34c61847e8c03c',
      bsc: '0x3eb41a0198fcb8fc68097ebade34c61847e8c03c',
      fantom: '0x3eb41a0198fcb8fc68097ebade34c61847e8c03c',
    },
    relay_10: {
      default: 19,
      main: '0x59046ddc0cca9cacee1d1ed6362a045faf33806d',
      polygon: '0x59046ddc0cca9cacee1d1ed6362a045faf33806d',
      bsc: '0x59046ddc0cca9cacee1d1ed6362a045faf33806d',
      fantom: '0x59046ddc0cca9cacee1d1ed6362a045faf33806d',
    },
    relay_11: {
      default: 20,
      main: '0x70a0da19e5ff5feb9e55ac54b9faf433287bcc76',
      polygon: '0x70a0da19e5ff5feb9e55ac54b9faf433287bcc76',
      bsc: '0x70a0da19e5ff5feb9e55ac54b9faf433287bcc76',
      fantom: '0x70a0da19e5ff5feb9e55ac54b9faf433287bcc76',
    },
    relay_12: {
      default: 21,
      main: '0xc1879b6720beffbe0934a51c3ea77460a368c781',
      polygon: '0xc1879b6720beffbe0934a51c3ea77460a368c781',
      bsc: '0xc1879b6720beffbe0934a51c3ea77460a368c781',
      fantom: '0xc1879b6720beffbe0934a51c3ea77460a368c781',
    },
    relay_13: {
      default: 22,
      main: '0x4cb2f1140f36850161231dcf5662661c53489550',
      polygon: '0x4cb2f1140f36850161231dcf5662661c53489550',
      bsc: '0x4cb2f1140f36850161231dcf5662661c53489550',
      fantom: '0x4cb2f1140f36850161231dcf5662661c53489550',
    },
    withdrawGuardian: {
      default: 23,
      main: '0xe29B04B9c6712080f79B2dAc5211B18B279D5DE0',
      polygon: '0xB8dD7223edc08A1681c81278D31d644576ECF0b4',
      bsc: '0xbF13DBbf86B6B1cc02a4169Dde38E16862C77a0a',
      fantom: '0x5B2329A2b2B5ec2f5F77afb6826F825dcec3A3Fd',
    }
  },
  abiExporter: {
    path: 'abi',
    clear: true,
    flat: true,
    spacing: 2
  }
};

module.exports = hardhatConfig;
