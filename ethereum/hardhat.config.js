require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require('hardhat-deploy-ethers');
require('hardhat-deploy');


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
    version: '0.8.0',
    settings: {
      optimizer: {
        enabled: true
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ETH_MAIN_ARCHIVE_HTTP,
        blockNumber: 12859605
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
    unlockReceiver: {
      default: 2,
    },
  },
  tokens: [
    ['usdt', '0xdac17f958d2ee523a2206206994597c13d831ec7'],
    ['usdc', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
    ['dai', '0x6b175474e89094c44da98b954eedeac495271d0f'],
    ['wbtc', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'],
    ['weth', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
    ['wton', '0xdB3C2515Da400e11Bcaf84f3b5286f18ffF1868F'],
    ['uniswap_v2_lp_usdt_wton', '0x5811ec00d774de2c72a51509257d50d1305358aa'],
    ['frax', '0x853d955aCEf822Db058eb8505911ED77F175b99e'],
    ['frax_share', '0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0'],
    ['sushi', '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2'],
    ['uni', '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'],
    ['aave', '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'],
    ['comp', '0xc00e94Cb662C3520282E6f5717214004A7f26888'],
    ['crv', '0xD533a949740bb3306d119CC777fa900bA034cd52'],
    ['stasis_eurs', '0xdB25f211AB05b1c97D595516F45794528a807ad8'],
    ['tornado', '0x77777FeDdddFfC19Ff86DB637967013e6C6A116C'],
    ['yearn', '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e'],
    ['1inch', '0x111111111117dC0aa78b770fA6A738034120C302'],
    ['dartflex', '0x255d578049b0Cc729dceC2F12Fa59867Eb0eCECB'],
  ]
};
