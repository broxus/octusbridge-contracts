require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");
require('hardhat-deploy-ethers');
require('hardhat-deploy');
require('hardhat-abi-exporter');
// require("hardhat-gas-reporter");
require('@primitivefi/hardhat-dodoc');
// require('hardhat-contract-sizer');
// require("hardhat-diamond-abi");
require('hardhat-dependency-compiler');


task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});


const proxyadmin = {
  // main: '0x5889d26Ad270540E315B028Dd39Ae0ECB3De6179',
  // polygon: '0x9f6898d5D36e2a4b9A0c6e58A0e86525475f58d7',
  // bsc: '0xa3CbceE67325bCa03aCCcD06b9121955CCF224C3',
  // fantom: '0x6dF42fdE8BC7AF2596a450b9af306EA2060Ec8dc',
  // avalanche: '0x25D28c131461dE91d42495d0DacC603AF3f4Eb33',
};

const multisig = {
  main: '0x840B3De19e3FAB72fa9A168bD8Dd71B678c57989',
  polygon: '0x3C85236De762DFF9FDE8A0c796ec2E089fC63Bc7',
  bsc: '0x3C85236De762DFF9FDE8A0c796ec2E089fC63Bc7',
  fantom: '0xa30808d1067fb7efFEC06F31b44A24cDC6df1A90',
  avalanche: '0xdad6133c8fA19f649769220e415Ae5EB408B207c'
};

const weth = {
  main: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
  polygon: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // https://polygonscan.com/token/0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270
  bsc: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // https://bscscan.com/address/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c
  fantom: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83', // https://ftmscan.com/token/0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83
  avalanche: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7' // https://snowtrace.io/token/0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7
};

const bridge = {
  // main: '0xF4404070f63a7E19Be0b1dd89A5fb88E12c0173A',
  // polygon: '0x62AE18A40Fa81697Fc7d0fe58402af5cAF795e68',
  // bsc: '0xc25CA21377C5bbC860F0bF48dF685D744A411489',
  // fantom: '0x9f6898d5D36e2a4b9A0c6e58A0e86525475f58d7',
  // avalanche: '0x32Be6537F7FD40A919158d94e1C15271bF9855cB'
};


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const hardhatConfig = {
  mocha:{
    bail: true
  },
  dependencyCompiler: {
    paths: [
      '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol',
      '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol',
    ],
  },
  diamondAbi: {
    // (required) The name of your Diamond ABI.
    name: "MultiVault",
    // (optional) An array of strings, matched against fully qualified contract names, to
    // determine which contracts are included in your Diamond ABI.
    include: [
        'interfaces/multivault/IMultiVault',
        'interfaces/IDiamondCut',
        'interfaces/IDiamondLoupe',
    ],
    // // (optional) An array of strings, matched against fully qualified contract names, to
    // // determine which contracts are excluded from your Diamond ABI.
    // exclude: ["vendor"],
    // // (optional) A function that is called with the ABI element, index, entire ABI,
    // // and fully qualified contract name for each item in the combined ABIs.
    // // If the function returns `false`, the function is not included in your Diamond ABI.
    // filter: function (abiElement, index, fullAbi, fullyQualifiedName) {
    //   return abiElement.name !== "superSecret";
    // },
    // (optional) Whether exact duplicate sighashes should cause an error to be thrown,
    // defaults to true.
    strict: true,
  },
  dodoc: {
    runOnCompile: true,
    outputDir: './../docs/evm-specification',
    include: ['bridge/Bridge.sol', 'vault/Vault.sol', 'DAO.sol', 'multivault/MultiVault.sol'],
    freshOutput: true,
    keepFileStructure: false
  },
  abiExporter: {
    path: 'abi',
    clear: true,
    flat: true,
    spacing: 2,
    runOnCompile: true,
    only: [':Vault$', ':Bridge$', ':DAO$', ':MultiVaultFacet', ':Diamond', ':StakingRelayVerifier']
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: [':VaultFacet', ':MultiVaultFacet'],
  },
  solidity: {
    compilers: [
      {
        version: '0.8.0',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          evmVersion: `paris`
        },
      },
      {
        version: '0.8.2',
        settings: {
          optimizer: {
            enabled: true,
            runs: 0
          }
        }
      },
    ]
  },
  deterministicDeployment: {
    "5": {
      factory: "0x2E1C8f0a898f7C839489b3CEf82dB5509208c109",
      deployer: "0x3b15820c35cC402Aac26687c62fA15A8267a9527",
      funding: "1000000000000000",
      signedTx: "0xf8a5808502540be400830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf32ea0cda55714569101ddcae9fa0ebf3aa3ba24e0fdc2c28b084af6d870eb415dbd9fa00ddb09d74974cc66e809b1f317de690a4f0f6c72a0fcaded884c0afda51654bc",
    },
    "3": {
      factory: "0x2E1C8f0a898f7C839489b3CEf82dB5509208c109",
      deployer: "0x3b15820c35cC402Aac26687c62fA15A8267a9527",
      funding: "1000000000000000",
      signedTx: "0xf8a5808502540be400830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf329a0b8b0134dfce102adb832b595305f9e84c9d7824af5aad82c80499d9915944a2aa00f9bbd1a582aded7e09f2be38924dd495d9bb0168ccba88701af415a21ef0e0c",
    },
    "1": {
      factory: "0xcD04370a052CC2EeA4feC3f96Dc5D5c6e2129c69",
      deployer: "0xdD54d5Fca0Df238f92A0421B31Ca766A20f70F6d",
      funding: "10000000000000000",
      signedTx: "0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf326a06be8767d0148bd0b97867a6ef2e7eb5c64f5924e9d1abaadf308caf65a590f28a01cf563db1c904a068702a0aa859f610706c928be59dec07eb86730a132c7ea82",
    },
    "56": {
      factory: "0xcD04370a052CC2EeA4feC3f96Dc5D5c6e2129c69",
      deployer: "0xdD54d5Fca0Df238f92A0421B31Ca766A20f70F6d",
      funding: "500000000000000",
      signedTx: "0xf8a68085012a05f200830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf38194a0cf5862bba33f3ce680f9a8070a11c45899b300bacafdfb193784fc64ceba79d8a062c53832b83e65d8488186d6d6b508e8793658a06912c8b4ba3ac98a8eb28217",
    },
    "137": {
      factory: "0xcD04370a052CC2EeA4feC3f96Dc5D5c6e2129c69",
      deployer: "0xdD54d5Fca0Df238f92A0421B31Ca766A20f70F6d",
      funding: "20000000000000000",
      signedTx: "0xf8a780852e90edd000830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3820136a05f4e192f944f4d708e916a7ad829c348eaa5a8b5413ea8dfe2d4d98d5b030141a04809c69bfcc5e0876adad0d5cdad928ea41d24b26ae9dfa159a75ed217e6fe90",
    },
    "250": {
      factory: "0xcD04370a052CC2EeA4feC3f96Dc5D5c6e2129c69",
      deployer: "0xdD54d5Fca0Df238f92A0421B31Ca766A20f70F6d",
      funding: "50000000000000000",
      signedTx: "0xf8a78085746a528800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3820217a06c337d22bed572141f530759e3d6390be456630218a5084f7fd06e9f0734a8e1a00c474f88289644b0f4bfd7c6bde7b55e043027ee03e4cd65a533a756698c2d33",
    },
    "2001": {
      factory: "0xcD04370a052CC2EeA4feC3f96Dc5D5c6e2129c69",
      deployer: "0xdD54d5Fca0Df238f92A0421B31Ca766A20f70F6d",
      funding: "10000000000000000",
      signedTx: "0xf8a78085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3820fc6a06618d4d7b9efae446845c081827c524a36a81a421f205126f298c5872141fba3a039f63392b00cfabb22747f45168ba13e781b21557139d9b068b7df83f22e023d",
    },
    "43114": {
      factory: "0xcD04370a052CC2EeA4feC3f96Dc5D5c6e2129c69",
      deployer: "0xdD54d5Fca0Df238f92A0421B31Ca766A20f70F6d",
      funding: "10000000000000000",
      signedTx: "0xf8a88085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3830150f7a027fe3b05132ecdd5b50e78b3bae1113c34c6222e01bf8e1aeb9500ee7f30d93fa01c38ee4f899bd4e729d716828dbb5a378ecce845f36f2af52edfcba632519b6d",
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      // forking: {
      //   url: process.env.ETH_MAIN_ARCHIVE_HTTP,
      //   blockNumber: 16233635,
      // },
      chainId: 1111,
      accounts: {
        count: 50
      }
    },
    main: {
      url: 'https://mainnet.infura.io/v3/f3ca4333bf4a41308d0a277ae1c09336',
      gasPrice: 30000000000, // 100 gwei
      gas: 3000000,
      timeout: 1000000,
      accounts: {
        mnemonic: process.env.ETH_MNEMONIC,
        count: 50
      },
    },
    polygon: {
      url: 'https://matic-mainnet.chainstacklabs.com',
      gasPrice: 300001000000, // 1.001 gwei
      gas: 3000000,
      timeout: 1000000,
      accounts: {
        mnemonic: process.env.ETH_MNEMONIC,
        count: 50
      },
    },
    bsc: {
      url: 'https://bsc-dataseed.binance.org/',
      gasPrice: 5000000000, // 5 gwei
      gas: 3000000,
      timeout: 1000000,
      accounts: {
        mnemonic: process.env.ETH_MNEMONIC,
        count: 50
      },
    },
    fantom: {
      url: 'https://rpc.ftm.tools/',
      gasPrice: 550000000000, // 550 gwei
      gas: 3000000,
      timeout: 1000000,
      accounts: {
        mnemonic: process.env.ETH_MNEMONIC,
        count: 50
      },
    },
    avalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      gasPrice: 100000000000, // 100 gwei
      gas: 3000000,
      timeout: 1000000,
      accounts: {
        mnemonic: process.env.ETH_MNEMONIC,
        count: 50
      },
    },
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 100,
    enabled: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    outputFile: 'gas-report.txt',
    noColors: true,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  },
  namedAccounts: {
    multisig: {
      hardhat: "0xe29B04B9c6712080f79B2dAc5211B18B279D5DE0"
    },
    dai_vault: {
      hardhat: '0x032d06b4cc8a914b85615acd0131c3e0a7330968',
      0: '0x032d06b4cc8a914b85615acd0131c3e0a7330968'
    },
    usdt_vault: {
      hardhat: '0x81598d5362eac63310e5719315497c5b8980c579',
      0: '0x81598d5362eac63310e5719315497c5b8980c579'
    },
    usdc_vault: {
      hardhat: '0xf8a0d53ddc6c92c3c59824f380c0f3d2a3cf521c',
      0: '0xf8a0d53ddc6c92c3c59824f380c0f3d2a3cf521c'
    },
    usdt: {
      hardhat: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      0: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    },
    proxy_admin: {
      hardhat: '0x5889d26Ad270540E315B028Dd39Ae0ECB3De6179'
    },
    deployer: {
      default: 4,
    },
    guardian: {
      default: 1,
    },
    management: {
      default: 2,
    },
    bridge: {
      default: '0x0000000000000000000000000000000000000000',
      ...bridge
    },
    proxyadmin: {
      default: '0x0000000000000000000000000000000000000000',
      ...proxyadmin
    },
    owner: {
      default: 3,
      ...multisig
    },
    weth: {
      default: weth.main,
      ...weth
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
      ...multisig
    },
    dai_owner: {
      default: '0xA929022c9107643515F5c777cE9a910F0D1e490C',
    },
    multivault: {
      default: '0x0000000000000000000000000000000000000000',
      main: '0x2Dc29C87162354289cC2a1C585bb20EadA0b382d',
      polygon: '0x2Dc29C87162354289cC2a1C585bb20EadA0b382d',
      bsc: '0x2Dc29C87162354289cC2a1C585bb20EadA0b382d',
      fantom: '0x2Dc29C87162354289cC2a1C585bb20EadA0b382d',
      avalanche: '0x2Dc29C87162354289cC2a1C585bb20EadA0b382d',
    },
    relay_1: {
      default: 10,
      main: '0xf7ae6b7c4a79c3b50b0e0c78aba20980ff49ad1b',
      polygon: '0xf7ae6b7c4a79c3b50b0e0c78aba20980ff49ad1b',
      bsc: '0xf7ae6b7c4a79c3b50b0e0c78aba20980ff49ad1b',
      fantom: '0xf7ae6b7c4a79c3b50b0e0c78aba20980ff49ad1b',
      avalanche: '0xf7ae6b7c4a79c3b50b0e0c78aba20980ff49ad1b',
    },
    relay_2: {
      default: 11,
      main: '0x1604ed0441d949df934be628f1ed2b0db2b29437',
      polygon: '0x1604ed0441d949df934be628f1ed2b0db2b29437',
      bsc: '0x1604ed0441d949df934be628f1ed2b0db2b29437',
      fantom: '0x1604ed0441d949df934be628f1ed2b0db2b29437',
      avalanche: '0x1604ed0441d949df934be628f1ed2b0db2b29437',
    },
    relay_3: {
      default: 12,
      main: '0xbdd25b57f53d516d73a67578a64958651b6824b4',
      polygon: '0xbdd25b57f53d516d73a67578a64958651b6824b4',
      bsc: '0xbdd25b57f53d516d73a67578a64958651b6824b4',
      fantom: '0xbdd25b57f53d516d73a67578a64958651b6824b4',
      avalanche: '0xbdd25b57f53d516d73a67578a64958651b6824b4',
    },
    relay_4: {
      default: 13,
      main: '0xb76e542f664073066e18fa76dc27dbbfefb64ec8',
      polygon: '0xb76e542f664073066e18fa76dc27dbbfefb64ec8',
      bsc: '0xb76e542f664073066e18fa76dc27dbbfefb64ec8',
      fantom: '0xb76e542f664073066e18fa76dc27dbbfefb64ec8',
      avalanche: '0xb76e542f664073066e18fa76dc27dbbfefb64ec8',
    },
    relay_5: {
      default: 14,
      main: '0xa2e2f1592e49ff8036e70bd2f3fee63084869e5a',
      polygon: '0xa2e2f1592e49ff8036e70bd2f3fee63084869e5a',
      bsc: '0xa2e2f1592e49ff8036e70bd2f3fee63084869e5a',
      fantom: '0xa2e2f1592e49ff8036e70bd2f3fee63084869e5a',
      avalanche: '0xa2e2f1592e49ff8036e70bd2f3fee63084869e5a',
    },
    relay_6: {
      default: 15,
      main: '0xf3f04502c00e7be82c3c3a0782646302729b561f',
      polygon: '0xf3f04502c00e7be82c3c3a0782646302729b561f',
      bsc: '0xf3f04502c00e7be82c3c3a0782646302729b561f',
      fantom: '0xf3f04502c00e7be82c3c3a0782646302729b561f',
      avalanche: '0xf3f04502c00e7be82c3c3a0782646302729b561f',
    },
    relay_7: {
      default: 16,
      main: '0x4b54583d919b8e2249df7355fd8c35ba0aadc43d',
      polygon: '0x4b54583d919b8e2249df7355fd8c35ba0aadc43d',
      bsc: '0x4b54583d919b8e2249df7355fd8c35ba0aadc43d',
      fantom: '0x4b54583d919b8e2249df7355fd8c35ba0aadc43d',
      avalanche: '0x4b54583d919b8e2249df7355fd8c35ba0aadc43d',
    },
    relay_8: {
      default: 17,
      main: '0xbea46a1ae3fce7e59741a17cfefaf510ec5ded52',
      polygon: '0xbea46a1ae3fce7e59741a17cfefaf510ec5ded52',
      bsc: '0xbea46a1ae3fce7e59741a17cfefaf510ec5ded52',
      fantom: '0xbea46a1ae3fce7e59741a17cfefaf510ec5ded52',
      avalanche: '0xbea46a1ae3fce7e59741a17cfefaf510ec5ded52',
    },
    relay_9: {
      default: 18,
      main: '0xdc59cbd3c0ad56e6da03b27bc599c42ce5aa02a9',
      polygon: '0xdc59cbd3c0ad56e6da03b27bc599c42ce5aa02a9',
      bsc: '0xdc59cbd3c0ad56e6da03b27bc599c42ce5aa02a9',
      fantom: '0xdc59cbd3c0ad56e6da03b27bc599c42ce5aa02a9',
      avalanche: '0xdc59cbd3c0ad56e6da03b27bc599c42ce5aa02a9',
    },
    withdrawGuardian: {
      default: 23,
      ...multisig
    },
    gasDonor: {
      default: 24
    }
  },
};

module.exports = hardhatConfig;
