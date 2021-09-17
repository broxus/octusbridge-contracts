const {
  isValidTonAddress,
} = require('./../test/utils');

const ethers = require('ethers');
const prompts = require('prompts');
const fs = require('fs');


const main = async () => {
  const responses = await prompts([
    {
      type: 'select',
      name: 'rpc',
      message: 'Choose Ethereum network',
      choices: [
        { title: 'Goerli',  value: process.env.ETH_GOERLI_HTTP },
        { title: 'Ethereum',  value: process.env.ETH_MAIN_HTTP },
      ],
    },
    {
      type: 'text',
      name: 'eth_bridge',
      message: 'Ethereum bridge contract',
      validate: value => ethers.utils.isAddress(value) ? true : 'Invalid Ethereum address',
      initial: '0x5B152cCf3daAF4bb5083Aa7B1A5e5a6b81D400a0'
    },
    {
      type: 'text',
      name: 'round_relays_configuration',
      message: 'TON round & relays configuration',
      validate: value => isValidTonAddress(value) ? true : 'Invalid TON address',
      initial: '0:dcb0e44ed53e2c4395e38acd752a8e602a8bd004797fa05fa764c03989ae6f21'
    },
  ]);

  // Connect to the Ethereum
  const provider = new ethers.providers.JsonRpcProvider(responses.rpc);
  const bridge = new ethers.Contract(
    responses.eth_bridge,
    JSON.parse(fs.readFileSync('./../ethereum/abi/Bridge.json')),
    provider
  );
  
  const lastRound = await bridge.lastRound();
  
  console.log(`Last round in Ethereum bridge: ${lastRound}`);

  // Get events from the configuration
  const roundRelaysConfiguration = await locklift.factory.getContract('TonEventConfiguration');
  roundRelaysConfiguration.address = responses.round_relays_configuration;

  const events = await roundRelaysConfiguration.getEvents('NewEventContract');
  
  console.log(`Found ${events.length} events`);
  // console.log(new Date(events[events.length - 1].created_at * 1000));
  // const minutesSinceLastEvent = (new Date() - new Date(events[events.length - 1].created_at * 1000));
  //
  // console.log(new Date(minutesSinceLastEvent * 1000).getMinutes());
  
  // Get event details
  const eventDetails = await Promise.all(events.map(async (event) => {
    const stakingTonEvent = await locklift.factory.getContract('StakingTonEvent');
    stakingTonEvent.address = event.value.eventContract;

    const details = await stakingTonEvent.call({method: 'getDetails'});
    const roundNumber = await stakingTonEvent.call({ method: 'round_number' });
    
    return {
      ...details,
      roundNumber,
      created_at: event.created_at
    };
  }));
  
  // Filter out rounds less than Ethereum's last round
  // Prepare Ethereum's (payload, signatures) for each round
};


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
