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
    {
      type: 'text',
      name: 'cell_encoder',
      message: 'TON CellEncoderStandalone',
      validate: value => isValidTonAddress(value) ? true : 'Invalid TON address',
      initial: '0:ff290020c10a2813107c50ba45a7859c67b2d240fe4ab4f34f9954a75aded5c3'
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

  const cellEncoderStandalone = await locklift.factory.getContract('CellEncoderStandalone');
  cellEncoderStandalone.setAddress(responses.cell_encoder);

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
    const eventData = await cellEncoderStandalone.call({
      method: 'decodeTonStakingEventData',
      params: {data: details._eventInitData.voteData.eventData}
    });
    const eventDataEncoded = ethers.utils.defaultAbiCoder.encode(
      ['uint32', 'uint160[]', 'uint32'],
      [eventData.round_num.toString(), eventData.eth_keys, eventData.round_end.toString()]
    );
    const roundNumber = await stakingTonEvent.call({ method: 'round_number' });

    const encodedEvent = ethers.utils.defaultAbiCoder.encode(
      [
        `tuple(
          uint64 eventTransactionLt,
          uint32 eventTimestamp,
          bytes eventData,
          int8 configurationWid,
          uint256 configurationAddress,
          int8 eventContractWid,
          uint256 eventContractAddress,
          address proxy,
          uint32 round
        )`
      ],
      [{
        eventTransactionLt: details._eventInitData.voteData.eventTransactionLt.toString(),
        eventTimestamp: details._eventInitData.voteData.eventTimestamp.toString(),
        eventData: eventDataEncoded,
        configurationWid: roundRelaysConfiguration.address.split(':')[0],
        configurationAddress: '0x' + roundRelaysConfiguration.address.split(':')[1],
        eventContractWid: event.value.eventContract.split(':')[0],
        eventContractAddress: '0x' + event.value.eventContract.split(':')[1],
        proxy: responses.eth_bridge,
        round: roundNumber.toString(),
      }]
    );

    return {
      ...details,
      roundNumber,
      encodedEvent,
      signatures: details._signatures,
      created_at: event.created_at
    };

  }));
  for (let event of eventDetails) {
    console.log(`Round Number: ${event.roundNumber}`);
    console.log(`Signatures: \n${event.signatures.map((b) => b.toString('hex'))}`);
    console.log(`Payload: ${event.encodedEvent}\n`);
  }
  // Filter out rounds less than Ethereum's last round
  // Prepare Ethereum's (payload, signatures) for each round
};


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
