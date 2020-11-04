const { TONClient } = require('ton-client-node-js');


const giverAbi = {
  "ABI version": 1,
  "functions": [
    {
      "name": "constructor",
      "inputs": [],
      "outputs": []
    },
    {
      "name": "sendGrams",
      "inputs": [
        {"name":"dest","type":"address"},
        {"name":"amount","type":"uint64"}
      ],
      "outputs": []
    }
  ],
  "events": [],
  "data": []
};


class ContractWrapper {
  constructor(config, abi, address) {
    this.config = config;
    this.abi = abi;
    this.address = address;
  }
  
  /**
   * Setup TON client instance
   * @returns {Promise<void>}
   */
  async setup() {
    this.ton = new TONClient();

    this.ton.config.setData({
      servers: [this.config.network],
      waitForTimeout: this.config.waitForTimeout ? this.config.waitForTimeout : 5000,
    });
    
    await this.ton.setup();
  }
  
  /**
   * Deploy smart contract to the network
   * @dev Uses Giver contract to pay for deploy (https://docs.ton.dev/86757ecb2/p/00f9a3-ton-os-se-giver)
   * @param imageBase64 Base64 encoded code
   * @param constructorParams Constructor params for contract constructor
   * @param initParams Initial state params for the contract
   * @param initialBalance TONs to request from giver for deployment
   * @returns {Promise<void>}
   */
  async deploy(
    imageBase64,
    constructorParams={},
    initParams={},
    initialBalance=1000000
  ) {
    await this.setup();
    
    // Derive future contract address from the deploy message
    const {
      address: futureAddress,
    } = await this.createDeployMessage(
      imageBase64,
      constructorParams,
      initParams
    );

    // Send grams from giver
    await this.requestGiverTONs(futureAddress, initialBalance);
  
    // Send the deploy message
    const deployMessage = await this.createDeployMessage(
      imageBase64,
      constructorParams,
      initParams,
    );
    
    // - Wait deployment confirmed
    await this.waitForRunTransaction(deployMessage);
    
    this.address = futureAddress;
  }
  
  /**
   * Creates deploy message without broadcasting it.
   * @dev Useful for deriving contract address.
   * @param imageBase64 Base64 encoded code
   * @param constructorParams Constructor params for contract constructor
   * @param initParams Initial state params for the contract
   * @returns {Promise<*>}
   */
  async createDeployMessage(imageBase64, constructorParams, initParams) {
    return this.ton.contracts.createDeployMessage({
      package: {
        abi: this.abi,
        imageBase64,
      },
      constructorParams,
      initParams,
      keyPair: this.config.keys,
    });
  }
  
  /**
   * Sends TONs to the specific address.
   * @param dest At which address to send TONs
   * @param amount How much TONs to send
   * @returns {Promise<void>}
   */
  async requestGiverTONs(dest, amount) {
    const message = await this.ton.contracts.createRunMessage({
      address: this.config.giver,
      functionName: 'sendGrams',
      abi: giverAbi,
      input: { dest, amount },
      keyPair: null,
    });
    
    await this.waitForRunTransaction(message);
  }
  
  /**
   * Handy way to wait until message confirmed or reverted
   * @dev Works both with deploy and run messages
   * @param message TON message to distribute
   * @returns {Promise<void>}
   */
  async waitForRunTransaction(message) {
    const messageProcessingState = await this
      .ton
      .contracts
      .sendMessage(message.message);
    
    await this
      .ton
      .contracts
      .waitForRunTransaction(
        message,
        messageProcessingState
      );
  }
}


module.exports = {
  ContractWrapper,
};
