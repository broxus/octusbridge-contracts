const { TONClient } = require('ton-client-node-js');
const utils = require('./utils');
const BigNumber = require('bignumber.js');


class TonWrapper {
  constructor({ giverConfig, ...config}) {
    this.config = config;
    this.giverConfig = giverConfig;
  }
  
  /**
   * Setup TON client instance
   * @returns {Promise<void>}
   */
  async setup() {
    await this._setupTonClient();
    await this._setupKeyPairs();
  }
  
  async afterRunHook() {
    const tonAfterRunSleepMs = process.env.TON_AFTER_RUN_SLEEP_MS;
    
    if (tonAfterRunSleepMs === undefined) {
      if (this.config.network === 'https://net.ton.dev') {
        await utils.sleep(4000);
      } else { // Default
        await utils.sleep(100);
      }
    } else {
      await utils.sleep( parseInt(process.env.TON_AFTER_RUN_SLEEP_MS));
    }
  }
  
  async _setupTonClient() {
    this.ton = new TONClient();
    
    this.ton.config.setData({
      servers: [this.config.network],
      waitForTimeout: this.config.waitForTimeout ? this.config.waitForTimeout : 5000,
      messageExpirationTimeout: 120000,
    });
    
    await this.ton.setup();
  }
  
  async _setupKeyPairs(keysAmount=100) {
    const keysHDPaths = await Promise.all([...Array(keysAmount).keys()].map(keyIndex => `m/44'/396'/0'/0/${keyIndex}`));
    
    this.keys = await Promise.all(keysHDPaths.map(async (path) => {
      return this.ton.crypto.mnemonicDeriveSignKeys({
        dictionary: 1,
        wordCount: 12,
        phrase: this.config.seed,
        path,
      });
    }));
  }
  
  async getBalance(address) {
    const [{ balance }] = await this.ton.queries.accounts.query(
      {
        id: { eq: address },
      },
      'balance',
    );
  
    return new BigNumber(balance);
  }
}


module.exports = {
  TonWrapper
};
