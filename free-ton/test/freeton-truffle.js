const { TONClient } = require('ton-client-node-js');
const { QMessageType } = require('ton-client-js');


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
  
  async _setupTonClient() {
    this.ton = new TONClient();
  
    this.ton.config.setData({
      servers: [this.config.network],
      waitForTimeout: this.config.waitForTimeout ? this.config.waitForTimeout : 5000,
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
}


class OutputDecoder {
  constructor(output, functionAttributes) {
    this.output = output;
    this.functionAttributes = functionAttributes;
  }
  
  decode_value(encoded_value, schema) {
    switch (schema.type) {
      case 'bytes':
        return this.decodeBytes(encoded_value);
      case 'uint256':
      case 'uint128':
      case 'uint64':
      case 'uint32':
      case 'uint16':
      case 'uint8':
        return this.decodeInt(encoded_value);
      case 'uint256[]':
      case 'uint128[]':
      case 'uint64[]':
      case 'uint32[]':
      case 'uint16[]':
      case 'uint8[]':
        return this.decodeIntArray(encoded_value);
      case 'bool':
        return this.decodeBool(encoded_value);
      case 'address':
        return encoded_value;
      case 'tuple':
        return this.decodeTuple(encoded_value, schema.components);
    }
  }
  
  decodeBytes(value) {
    return Buffer.from(value, 'hex');
  }
  
  decodeBool(value) {
    return Boolean(value);
  }
  
  decodeInt(value) {
    return BigInt(value);
  }
  
  decodeIntArray(value) {
    return value.map(hexInt => BigInt(hexInt));
  }
  
  decode() {
    const outputDecoded = this.decodeTuple(
      this.output,
      this.functionAttributes.outputs
    );
  
    // Return single output without array notation
    if (Object.keys(outputDecoded).length === 1) {
      return Object.values(outputDecoded)[0];
    }
  
    return outputDecoded;
  }
  
  decodeTuple(value, schema) {
    const res_struct = {};
    
    schema.forEach((field_value_schema) => {
      const field_value = value[field_value_schema.name];
      res_struct[field_value_schema.name] = this.decode_value(field_value, field_value_schema)
    });

    return res_struct;
  }
}


class ContractWrapper {
  constructor(tonWrapper, abi, address) {
    this.tonWrapper = tonWrapper;
    this.abi = abi;
    this.address = address;
  }
  
  /**
   * Deploy smart contract to the network
   * @dev Uses Giver contract to pay for deploy (https://docs.ton.dev/86757ecb2/p/00f9a3-ton-os-se-giver)
   * @param imageBase64 Base64 encoded code
   * @param constructorParams Constructor params for contract constructor
   * @param initParams Initial state params for the contract
   * @param initialBalance TONs to request from giver for deployment
   * @param giverConfig Giver ABI and address
   * @returns {Promise<void>}
   */
  async deploy(
    imageBase64,
    constructorParams={},
    initParams={},
    initialBalance=10000000000,
  ) {
    // Derive future contract address from the deploy message
    const {
      address: futureAddress,
    } = await this.createDeployMessage(
      imageBase64,
      constructorParams,
      initParams
    );

    // Send grams from giver to pay for contract deployment
    const giverContract = new ContractWrapper(
      this.tonWrapper,
      this.tonWrapper.giverConfig.abi,
      this.tonWrapper.giverConfig.address,
    );

    await giverContract.run('sendGrams', {
      dest: futureAddress,
      amount: initialBalance,
    });

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
   * @param keyPair Keys to use (first keys from the tonWrapper by default)
   * @returns {Promise<*>}
   */
  async createDeployMessage(imageBase64, constructorParams, initParams, keyPair) {
    return this.tonWrapper.ton.contracts.createDeployMessage({
      package: {
        abi: this.abi,
        imageBase64,
      },
      constructorParams,
      initParams,
      keyPair: keyPair === undefined ? this.tonWrapper.keys[0] : keyPair,
    });
  }
  
  /**
   * Handy way to wait until message confirmed or reverted
   * @dev Works both with deploy and run messages
   * @param message TON message to distribute
   * @returns {Promise<void>}
   */
  async waitForRunTransaction(message) {
    const messageProcessingState = await this
      .tonWrapper
      .ton
      .contracts
      .sendMessage(message.message);
    
    await this
      .tonWrapper
      .ton
      .contracts
      .waitForRunTransaction(
        message,
        messageProcessingState
      );
  }
  
  /**
   * Run method function (in terms of TON - call).
   * @param functionName Name of the function
   * @param input Dict of method parameters
   * @param keyPair
   * @returns {Promise<void>}
   */
  async run(functionName, input={}, keyPair) {
    const runMessage = await this.tonWrapper.ton.contracts.createRunMessage({
      address: this.address,
      abi: this.abi,
      functionName,
      input,
      keyPair: keyPair === undefined ? this.tonWrapper.keys[0] : keyPair,
    });
    
    await this.waitForRunTransaction(runMessage);
  }
  
  /**
   * Read data from the contract (in terms of TON - run).
   * @param functionName
   * @param input
   * @returns {Promise<unknown[]>}
   */
  async runLocal(functionName, input={}) {
    const { output } = await this.tonWrapper.ton.contracts.runLocal({
      address: this.address,
      abi: this.abi,
      functionName,
      fullRun: false,
      input,
      // keyPair: this.config.keys,
    });
    
    // Decode output
    const functionAttributes = this.abi.functions.find(({ name }) => name === functionName);
    
    const outputDecoder = new OutputDecoder(output, functionAttributes);
    
    return outputDecoder.decode();
  }
  
  /**
   * Decode list of messages according to the ABI
   * @param messages
   * @param internal
   * @param messageDirection
   * @returns {Promise<unknown[]>}
   */
  async decodeMessages(messages, internal, messageDirection) {
    const decodedMessages = await Promise.all(messages.map(async (message) => {
      try {
        const decodeFunction = messageDirection === 'output' ? 'decodeOutputMessageBody' : 'decodeInputMessageBody';
        
        const decodedMessage = await this
          .tonWrapper
          .ton
          .contracts[decodeFunction]({
            abi: this.abi,
            bodyBase64: message.body,
            internal,
          });
      
        return {
          ...decodedMessage,
          messageId: message.id,
          src: message.src,
        };
      } catch (e) {
        return null;
      }
    }));
  
    return decodedMessages.filter(message => message !== null);
  }
  
  async getReceivedMessages(messageType, internal) {
    const messages = (await this.tonWrapper.ton.queries.messages.query({
        dst: { eq: this.address },
        msg_type: { eq: messageType }
      },
      'body id src',
    ));
    
    return this.decodeMessages(messages, internal, 'input');
  }
  
  /**
   * Get list of messages, sent from the contract
   * @param messageType Message type
   * @param internal Internal type
   * @returns {Promise<unknown[]>} List of messages
   */
  async getSentMessages(messageType, internal) {
    const messages = (await this.tonWrapper.ton.queries.messages.query({
        src: { eq: this.address },
        msg_type: { eq: messageType }
      },
      'body id src',
    ));
  
    return this.decodeMessages(messages, internal, 'output');
  }
  
  /**
   * Get solidity events, emitted by the contract.
   * @dev Under the hood, events are extOut messages
   * @param eventName Event name
   * @returns {Promise<*>} List of emitted events
   */
  async getEvents(eventName) {
    const sentMessages = await this.getSentMessages(QMessageType.extOut, false);
    
    return sentMessages.filter((message) => message.function === eventName);
  }
}


module.exports = {
  ContractWrapper,
  TonWrapper,
};
