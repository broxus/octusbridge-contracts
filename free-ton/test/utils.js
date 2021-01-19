const _ = require('underscore');
const freeton = require('ton-testing-suite');


class RelaysManager {
  constructor(amount, tonWrapper) {
    this.amount = amount;
    this.tonWrapper = tonWrapper;

    this.accounts = [];
  }
  
  async setup() {
    for (const relayId of _.range(0, this.amount)) {
      const RelayAccount = await freeton
        .requireContract(this.tonWrapper, 'RelayAccount');
    
      await RelayAccount.loadMigration(`Relay_${relayId}`);
    
      this.accounts.push(RelayAccount);
    }
  }
  
  async runTarget({ contract, method, input, value }, relayId=0) {
    if (relayId >= this.accounts.length) {
      throw new Error(`Not enough relays (ID ${relayId})`);
    }

    const message = await this.tonWrapper.ton.abi.encode_message_body({
      address: contract.address,
      abi: {
        type: "Contract",
        value: contract.abi,
      },
      call_set: {
        function_name: method,
        input,
      },
      signer: {
        type: 'None',
      },
      is_internal: true,
    });
  
    return this.accounts[relayId].run('sendTransaction', {
      dest: contract.address,
      value: value === undefined ? freeton.utils.convertCrystal('1', 'nano') : value,
      bounce: true,
      flags: 0,
      payload: message.body,
    }, this.tonWrapper.keys[relayId]);
  }
}


module.exports = {
  RelaysManager,
};
