const {
  setupBridge,
  setupEthereumEventConfiguration,
  enableEventConfiguration,
} = require('./../test/utils');

const logger = require('mocha-logger');
const _ = require('underscore');


const genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

// Dummy function for generating random objects
const setupRelays = async (amount) => {
  const relays = [];
  
  for (const relayId of _.range(amount)) {
    const relay = await locklift.factory.getAccount('Wallet');
    
    relay.name = `Relay #${relayId}`;
    relay.setAddress(`0:${genRanHex(64)}`);
    
    relays.push(relay);
  }
  
  return relays;
};


async function main() {
  const relays = await setupRelays(100);
  
  const [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  
  const [ethereumEventConfiguration, proxy, initializer] = await setupEthereumEventConfiguration(
    bridgeOwner,
    staking,
    cellEncoder,
  );
  
  await enableEventConfiguration(
    bridgeOwner,
    bridge,
    ethereumEventConfiguration,
    'ethereum'
  );
  
  // Initialize dummy ethereum event
  const eventDataStructure = {
    tokens: 100,
    wid: 0,
    owner_addr: 111,
    owner_pubkey: 222,
  };
  
  const eventData = await cellEncoder.call({
    method: 'encodeEthereumEventData',
    params: eventDataStructure
  });
  
  const eventVoteData = {
    eventTransaction: 111,
    eventIndex: 222,
    eventData,
    eventBlockNumber: 333,
    eventBlock: 444,
    round: 555,
  };
  
  const tx = await initializer.runTarget({
    contract: ethereumEventConfiguration,
    method: 'deployEvent',
    params: {
      eventVoteData,
    },
    value: locklift.utils.convertCrystal(3, 'nano')
  });
  
  logger.log(`Event initialization tx: ${tx.transaction.id}`);
}


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
