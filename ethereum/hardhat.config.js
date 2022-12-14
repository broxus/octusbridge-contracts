require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");
require('hardhat-deploy-ethers');
require('hardhat-deploy');
require('hardhat-abi-exporter');
require("hardhat-gas-reporter");
require('@primitivefi/hardhat-dodoc');
require('hardhat-contract-sizer');
require("hardhat-diamond-abi");


task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});


const multisig = {
  main: '0xe29B04B9c6712080f79B2dAc5211B18B279D5DE0',
  polygon: '0xB8dD7223edc08A1681c81278D31d644576ECF0b4',
  bsc: '0xbF13DBbf86B6B1cc02a4169Dde38E16862C77a0a',
  fantom: '0x5B2329A2b2B5ec2f5F77afb6826F825dcec3A3Fd',
};

const bridge = {
  main: '0xF4404070f63a7E19Be0b1dd89A5fb88E12c0173A',
  polygon: '0x62AE18A40Fa81697Fc7d0fe58402af5cAF795e68',
  bsc: '0xc25CA21377C5bbC860F0bF48dF685D744A411489',
  fantom: '0x9f6898d5D36e2a4b9A0c6e58A0e86525475f58d7',
};


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const hardhatConfig = {
  diamondAbi: {
    // (required) The name of your Diamond ABI.
    name: "MultiVault",
    // (optional) An array of strings, matched against fully qualified contract names, to
    // determine which contracts are included in your Diamond ABI.
    include: ['interfaces/multivault/IMultiVault'],
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
    only: [':Vault$', ':Bridge$', ':DAO$', ':MultiVaultFacet']
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
        version: '0.8.1',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
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
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      forking: {
        url: process.env.ETH_MAIN_ARCHIVE_HTTP,
        blockNumber: 16021525,
      },
      chainId: 1111,
      accounts: {
        count: 50
      }
    },
    main: {
      url: 'https://mainnet.infura.io/v3/f3ca4333bf4a41308d0a277ae1c09336',
      gasPrice: 100000000000, // 100 gwei
      gas: 3000000,
      timeout: 1000000,
      accounts: {
        mnemonic: process.env.ETH_MNEMONIC,
        count: 50
      },
    },
    polygon: {
      url: 'https://matic-mainnet.chainstacklabs.com',
      gasPrice: 1001000000, // 1.001 gwei
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
    goerli: {
      url: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      gasPrice: 1500000007,
      gas: 3000000,
      timeout: 1000000,
      accounts: {
        mnemonic: process.env.ETH_MNEMONIC,
        count: 50
      },
    },
    ropsten: {
      url: 'https://ropsten.infura.io/v3/f3ca4333bf4a41308d0a277ae1c09336',
      gasPrice: 1500000007,
      gas: 3000000,
      timeout: 1000000,
      accounts: {
        mnemonic: process.env.ETH_MNEMONIC,
        count: 50
      },
    }
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
      default: 0,
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
    owner: {
      default: 3,
      ...multisig
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
    relay_1: {
      default: 10,
      ropsten: '0xA54364663D6C0f0bC0E6D282580C82256aB79dfD',
      goerli: '0xA54364663D6C0f0bC0E6D282580C82256aB79dfD',
      main: '0xA54364663D6C0f0bC0E6D282580C82256aB79dfD',
      polygon: '0xA54364663D6C0f0bC0E6D282580C82256aB79dfD',
      bsc: '0xA54364663D6C0f0bC0E6D282580C82256aB79dfD',
      fantom: '0xA54364663D6C0f0bC0E6D282580C82256aB79dfD'
    },
    relay_2: {
      default: 11,
      ropsten: '0x1bA36D24E58302A713FbBDAAFB82D7E5FB8A66BC',
      goerli: '0x1bA36D24E58302A713FbBDAAFB82D7E5FB8A66BC',
      main: '0x1bA36D24E58302A713FbBDAAFB82D7E5FB8A66BC',
      polygon: '0x1bA36D24E58302A713FbBDAAFB82D7E5FB8A66BC',
      bsc: '0x1bA36D24E58302A713FbBDAAFB82D7E5FB8A66BC',
      fantom: '0x1bA36D24E58302A713FbBDAAFB82D7E5FB8A66BC'
    },
    relay_3: {
      default: 12,
      ropsten: '0xCF4814AcAf02DBe83E9BC2f02D98b879a5055E1f',
      goerli: '0xCF4814AcAf02DBe83E9BC2f02D98b879a5055E1f',
      main: '0xCF4814AcAf02DBe83E9BC2f02D98b879a5055E1f',
      polygon: '0xCF4814AcAf02DBe83E9BC2f02D98b879a5055E1f',
      bsc: '0xCF4814AcAf02DBe83E9BC2f02D98b879a5055E1f',
      fantom: '0xCF4814AcAf02DBe83E9BC2f02D98b879a5055E1f'
    },
    relay_4: {
      default: 13,
      ropsten: '0x7FB8Ba3b7Dc351eBDAbceA134D055F2512383500',
      goerli: '0x7FB8Ba3b7Dc351eBDAbceA134D055F2512383500',
      main: '0x7FB8Ba3b7Dc351eBDAbceA134D055F2512383500',
      polygon: '0x7FB8Ba3b7Dc351eBDAbceA134D055F2512383500',
      bsc: '0x7FB8Ba3b7Dc351eBDAbceA134D055F2512383500',
      fantom: '0x7FB8Ba3b7Dc351eBDAbceA134D055F2512383500'
    },
    relay_5: {
      default: 14,
      ropsten: '0x6A2070BC7DD5c592dA7b07Ab34041ABce9628427',
      goerli: '0x6A2070BC7DD5c592dA7b07Ab34041ABce9628427',
      main: '0x6A2070BC7DD5c592dA7b07Ab34041ABce9628427',
      polygon: '0x6A2070BC7DD5c592dA7b07Ab34041ABce9628427',
      bsc: '0x6A2070BC7DD5c592dA7b07Ab34041ABce9628427',
      fantom: '0x6A2070BC7DD5c592dA7b07Ab34041ABce9628427'
    },
    relay_6: {
      default: 15,
      ropsten: '0xE9D34fB58964c10027CB6CA070eb94efE301091F',
      goerli: '0xE9D34fB58964c10027CB6CA070eb94efE301091F',
      main: '0xE9D34fB58964c10027CB6CA070eb94efE301091F',
      polygon: '0xE9D34fB58964c10027CB6CA070eb94efE301091F',
      bsc: '0xE9D34fB58964c10027CB6CA070eb94efE301091F',
      fantom: '0xE9D34fB58964c10027CB6CA070eb94efE301091F'
    },
    relay_7: {
      default: 16,
      ropsten: '0xB978AD11dA94aD99D9a17b2C5a2de71aaD2c8AC8',
      goerli: '0xB978AD11dA94aD99D9a17b2C5a2de71aaD2c8AC8',
      main: '0xB978AD11dA94aD99D9a17b2C5a2de71aaD2c8AC8',
      polygon: '0xB978AD11dA94aD99D9a17b2C5a2de71aaD2c8AC8',
      bsc: '0xB978AD11dA94aD99D9a17b2C5a2de71aaD2c8AC8',
      fantom: '0xB978AD11dA94aD99D9a17b2C5a2de71aaD2c8AC8'
    },
    relay_8: {
      default: 17,
      ropsten: '0x4cF29aD4FAeB5191003Bafced4457091423f892B',
      goerli: '0x4cF29aD4FAeB5191003Bafced4457091423f892B',
      main: '0x4cF29aD4FAeB5191003Bafced4457091423f892B',
      polygon: '0x4cF29aD4FAeB5191003Bafced4457091423f892B',
      bsc: '0x4cF29aD4FAeB5191003Bafced4457091423f892B',
      fantom: '0x4cF29aD4FAeB5191003Bafced4457091423f892B'
    },
    relay_9: {
      default: 18,
      ropsten: '0x3Eb41a0198FCB8fc68097ebadE34C61847e8C03C',
      goerli: '0x3Eb41a0198FCB8fc68097ebadE34C61847e8C03C',
      main: '0x3Eb41a0198FCB8fc68097ebadE34C61847e8C03C',
      polygon: '0x3Eb41a0198FCB8fc68097ebadE34C61847e8C03C',
      bsc: '0x3Eb41a0198FCB8fc68097ebadE34C61847e8C03C',
      fantom: '0x3Eb41a0198FCB8fc68097ebadE34C61847e8C03C'
    },
    relay_10: {
      default: 19,
      ropsten: '0x16532B04d536fdC7e2aFE75Dd95B65951dEE820a',
      goerli: '0x16532B04d536fdC7e2aFE75Dd95B65951dEE820a',
      main: '0x16532B04d536fdC7e2aFE75Dd95B65951dEE820a',
      polygon: '0x16532B04d536fdC7e2aFE75Dd95B65951dEE820a',
      bsc: '0x16532B04d536fdC7e2aFE75Dd95B65951dEE820a',
      fantom: '0x16532B04d536fdC7e2aFE75Dd95B65951dEE820a'
    },
    relay_11: {
      default: 20,
      ropsten: '0x70a0dA19e5Ff5feb9E55Ac54b9faf433287BCc76',
      goerli: '0x70a0dA19e5Ff5feb9E55Ac54b9faf433287BCc76',
      main: '0x70a0dA19e5Ff5feb9E55Ac54b9faf433287BCc76',
      polygon: '0x70a0dA19e5Ff5feb9E55Ac54b9faf433287BCc76',
      bsc: '0x70a0dA19e5Ff5feb9E55Ac54b9faf433287BCc76',
      fantom: '0x70a0dA19e5Ff5feb9E55Ac54b9faf433287BCc76'
    },
    relay_12: {
      default: 21,
      ropsten: '0xC1879B6720beFfbE0934a51c3ea77460A368C781',
      goerli: '0xC1879B6720beFfbE0934a51c3ea77460A368C781',
      main: '0xC1879B6720beFfbE0934a51c3ea77460A368C781',
      polygon: '0xC1879B6720beFfbE0934a51c3ea77460A368C781',
      bsc: '0xC1879B6720beFfbE0934a51c3ea77460A368C781',
      fantom: '0xC1879B6720beFfbE0934a51c3ea77460A368C781'
    },
    relay_13: {
      default: 22,
      ropsten: '0x882Cecc2632e19d46feC8aED5FeC2f2de88FB56A',
      goerli: '0x882Cecc2632e19d46feC8aED5FeC2f2de88FB56A',
      main: '0x882Cecc2632e19d46feC8aED5FeC2f2de88FB56A',
      polygon: '0x882Cecc2632e19d46feC8aED5FeC2f2de88FB56A',
      bsc: '0x882Cecc2632e19d46feC8aED5FeC2f2de88FB56A',
      fantom: '0x882Cecc2632e19d46feC8aED5FeC2f2de88FB56A'
    },
    relay_14: {
      default: 23,
      ropsten: '0xC5023CE9F22cD7d545bB9e50D1C867290312d761',
      goerli: '0xC5023CE9F22cD7d545bB9e50D1C867290312d761',
      main: '0xC5023CE9F22cD7d545bB9e50D1C867290312d761',
      polygon: '0xC5023CE9F22cD7d545bB9e50D1C867290312d761',
      bsc: '0xC5023CE9F22cD7d545bB9e50D1C867290312d761',
      fantom: '0xC5023CE9F22cD7d545bB9e50D1C867290312d761'
    },
    relay_15: {
      default: 24,
      ropsten: '0xC97E42a0ACB49273688b867AFb2d5bbe989cABE0',
      goerli: '0xC97E42a0ACB49273688b867AFb2d5bbe989cABE0',
      main: '0xC97E42a0ACB49273688b867AFb2d5bbe989cABE0',
      polygon: '0xC97E42a0ACB49273688b867AFb2d5bbe989cABE0',
      bsc: '0xC97E42a0ACB49273688b867AFb2d5bbe989cABE0',
      fantom: '0xC97E42a0ACB49273688b867AFb2d5bbe989cABE0'
    },
    relay_16: {
      default: 25,
      ropsten: '0xF81Ad5dF888140915aaa2d636A948F5f32ae7113',
      goerli: '0xF81Ad5dF888140915aaa2d636A948F5f32ae7113',
      main: '0xF81Ad5dF888140915aaa2d636A948F5f32ae7113',
      polygon: '0xF81Ad5dF888140915aaa2d636A948F5f32ae7113',
      bsc: '0xF81Ad5dF888140915aaa2d636A948F5f32ae7113',
      fantom: '0xF81Ad5dF888140915aaa2d636A948F5f32ae7113'
    },
    relay_17: {
      default: 26,
      ropsten: '0x1a88767a059946C9Ed07D5e3FCccA7D46D9F8bF0',
      goerli: '0x1a88767a059946C9Ed07D5e3FCccA7D46D9F8bF0',
      main: '0x1a88767a059946C9Ed07D5e3FCccA7D46D9F8bF0',
      polygon: '0x1a88767a059946C9Ed07D5e3FCccA7D46D9F8bF0',
      bsc: '0x1a88767a059946C9Ed07D5e3FCccA7D46D9F8bF0',
      fantom: '0x1a88767a059946C9Ed07D5e3FCccA7D46D9F8bF0'
    },
    relay_18: {
      default: 27,
      ropsten: '0xCC9f29245465C7941707cc206568BFd9Ce3ECf49',
      goerli: '0xCC9f29245465C7941707cc206568BFd9Ce3ECf49',
      main: '0xCC9f29245465C7941707cc206568BFd9Ce3ECf49',
      polygon: '0xCC9f29245465C7941707cc206568BFd9Ce3ECf49',
      bsc: '0xCC9f29245465C7941707cc206568BFd9Ce3ECf49',
      fantom: '0xCC9f29245465C7941707cc206568BFd9Ce3ECf49'
    },
    relay_19: {
      default: 28,
      ropsten: '0x4cb2f1140F36850161231Dcf5662661c53489550',
      goerli: '0x4cb2f1140F36850161231Dcf5662661c53489550',
      main: '0x4cb2f1140F36850161231Dcf5662661c53489550',
      polygon: '0x4cb2f1140F36850161231Dcf5662661c53489550',
      bsc: '0x4cb2f1140F36850161231Dcf5662661c53489550',
      fantom: '0x4cb2f1140F36850161231Dcf5662661c53489550'
    },
    relay_20: {
      default: 29,
      ropsten: '0xEc1218E93Aaa54d649f3a6EB90443b6139bb9FD4',
      goerli: '0xEc1218E93Aaa54d649f3a6EB90443b6139bb9FD4',
      main: '0xEc1218E93Aaa54d649f3a6EB90443b6139bb9FD4',
      polygon: '0xEc1218E93Aaa54d649f3a6EB90443b6139bb9FD4',
      bsc: '0xEc1218E93Aaa54d649f3a6EB90443b6139bb9FD4',
      fantom: '0xEc1218E93Aaa54d649f3a6EB90443b6139bb9FD4'
    },
    relay_21: {
      default: 30,
      ropsten: '0xa89145c6a87BB6644071843F75b9c0ba74C2EcFb',
      goerli: '0xa89145c6a87BB6644071843F75b9c0ba74C2EcFb',
      main: '0xa89145c6a87BB6644071843F75b9c0ba74C2EcFb',
      polygon: '0xa89145c6a87BB6644071843F75b9c0ba74C2EcFb',
      bsc: '0xa89145c6a87BB6644071843F75b9c0ba74C2EcFb',
      fantom: '0xa89145c6a87BB6644071843F75b9c0ba74C2EcFb'
    },
    relay_22: {
      default: 31,
      ropsten: '0x59046DdC0CcA9CAceE1d1ed6362A045faF33806D',
      goerli: '0x59046DdC0CcA9CAceE1d1ed6362A045faF33806D',
      main: '0x59046DdC0CcA9CAceE1d1ed6362A045faF33806D',
      polygon: '0x59046DdC0CcA9CAceE1d1ed6362A045faF33806D',
      bsc: '0x59046DdC0CcA9CAceE1d1ed6362A045faF33806D',
      fantom: '0x59046DdC0CcA9CAceE1d1ed6362A045faF33806D'
    },
    relay_23: {
      default: 32,
      ropsten: '0xAfA0109C95bffaBB215A0eA378EDc96562E4B783',
      goerli: '0xAfA0109C95bffaBB215A0eA378EDc96562E4B783',
      main: '0xAfA0109C95bffaBB215A0eA378EDc96562E4B783',
      polygon: '0xAfA0109C95bffaBB215A0eA378EDc96562E4B783',
      bsc: '0xAfA0109C95bffaBB215A0eA378EDc96562E4B783',
      fantom: '0xAfA0109C95bffaBB215A0eA378EDc96562E4B783'
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
