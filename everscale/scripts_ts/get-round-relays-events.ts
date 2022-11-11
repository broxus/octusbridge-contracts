export {};

import { Address } from "locklift";

const ethers = require("ethers");
const fs = require("fs");

const requireEnv = (name: string) => {
  const value = process.env[name];

  if (value === undefined) {
    throw new Error(`Missing env at ${name}`);
  }

  return value;
};

const main = async () => {
  const rpc = requireEnv("EVM_RPC");
  const bridgeAddress = requireEnv("EVM_BRIDGE");
  const configuration = requireEnv("ROUND_RELAYS_CONFIGURATION");
  const seed = requireEnv("EVM_SEED");
  const cellEncoder = requireEnv("CELL_ENCODER");
  const targetGasPrice = ethers.utils.parseUnits(
    requireEnv("TARGET_GAS_PRICE"),
    9
  );

  // Connect to the Ethereum
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const bridge = new ethers.Contract(
    bridgeAddress,
    JSON.parse(fs.readFileSync("./../ethereum/abi/Bridge.json")),
    provider
  );
  const submitter = ethers.Wallet.fromMnemonic(seed).connect(provider);

  const lastRound = await bridge.lastRound();

  console.log(`Last round in Ethereum bridge: ${lastRound}`);

  // Get events from the configuration
  const roundRelaysConfiguration = await locklift.factory.getDeployedContract(
    "EverscaleEthereumEventConfiguration",
    new Address(configuration)
  );

  const cellEncoderStandalone = await locklift.factory.getDeployedContract(
    "CellEncoderStandalone",
    new Address(cellEncoder)
  );

  // const events = await roundRelaysConfiguration.getEvents('NewEventContract');

  const events = await roundRelaysConfiguration
    .getPastEvents({})
    .then((e) => e.events);

  const roundRelaysConfigurationDetails = await roundRelaysConfiguration.methods
    .getDetails({ answerId: 0 })
    .call();

  console.log(`Found ${events.length} events`);

  // Get event details
  const eventDetails = await Promise.all(
    events.map(async (event: any) => {
      const stakingTonEvent = await locklift.factory.getDeployedContract(
        "StakingEverscaleEthereumEvent",
        event.value.eventContract
      );

      const details = await stakingTonEvent.methods
        .getDetails({ answerId: 0 })
        .call();

      // console.log(stakingTonEvent.address);
      // console.log(details);

      const eventData = await cellEncoderStandalone.methods
        .decodeEverscaleEthereumStakingEventData({
          data: details._eventInitData.voteData.eventData,
        })
        .call();
      const eventDataEncoded = ethers.utils.defaultAbiCoder.encode(
        ["uint32", "uint160[]", "uint32"],
        [
          eventData.round_num.toString(),
          eventData.eth_keys,
          eventData.round_end.toString(),
        ]
      );
      const roundNumber = await stakingTonEvent.methods.round_number().call();

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
        )`,
        ],
        [
          {
            eventTransactionLt:
              details._eventInitData.voteData.eventTransactionLt.toString(),
            eventTimestamp:
              details._eventInitData.voteData.eventTimestamp.toString(),
            eventData: eventDataEncoded,
            configurationWid: roundRelaysConfiguration.address
              .toString()
              .split(":")[0],
            configurationAddress:
              "0x" + roundRelaysConfiguration.address.toString().split(":")[1],
            eventContractWid: event.value.eventContract.split(":")[0],
            eventContractAddress:
              "0x" + event.value.eventContract.split(":")[1],
            proxy: `0x${roundRelaysConfigurationDetails._networkConfiguration.proxy}`,
            round: roundNumber.toString(),
          },
        ]
      );
      let signatures = await Promise.all(
        details._signatures.map(async (sign: any) => {
          return {
            sign,
            address: ethers.BigNumber.from(
              await bridge.recoverSignature(encodedEvent, sign)
            ),
          };
        })
      );

      signatures.sort((a: any, b: any) => {
        if (a.address.eq(b.address)) {
          return 0;
        }
        if (a.address.gt(b.address)) {
          return 1;
        } else {
          return -1;
        }
      });

      return {
        ...details,
        roundNumber,
        encodedEvent,
        eventData,
        eventContract: event.value.eventContract,
        signatures: signatures.map((d: any) => d.sign),
        created_at: event.created_at,
      };
    })
  );

  for (let event of eventDetails.sort((a, b) =>
    a.roundNumber < b.roundNumber ? -1 : 1
  )) {
    console.log(`Round Number: ${event.eventData.round_num}`);
    console.log(`Event contract: ${event.eventContract}`);
    console.log(`Payload: ${event.encodedEvent}`);
    console.log(
      `Signatures: \n[${event.signatures
        .map((b: any) => "0x" + b.toString("hex"))
        .join(",")}]`
    );

    if (event.eventData.round_num > lastRound) {
      console.log(`Submitting round`);

      console.log(`Submitter: ${submitter.address}`);
      console.log(
        `Balance: ${ethers.utils.formatUnits(
          await provider.getBalance(submitter.address),
          18
        )}`
      );

      const gasPrice = await provider.getGasPrice();
      console.log(`Gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")}`);
      console.log(
        `Target gas price: ${ethers.utils.formatUnits(targetGasPrice, "gwei")}`
      );

      // Check submitter dont have any pending transactions
      const pendingCount = await provider.getTransactionCount(
        submitter.address,
        "pending"
      );
      const confirmedCount = await provider.getTransactionCount(
        submitter.address,
        "latest"
      );

      console.log(
        `Submitter transactions count: pending - ${pendingCount}, confirmed - ${confirmedCount}`
      );

      if (pendingCount > confirmedCount) {
        console.log(`Submitter has pending transactions, exit`);
        process.exit(1);
      }

      const tx = await bridge
        .connect(submitter)
        .setRoundRelays(event.encodedEvent, event.signatures, {
          gasPrice: targetGasPrice.gt(gasPrice) ? gasPrice : targetGasPrice, // Use min gas price possible
        });

      console.log(`Transaction: ${tx.hash}`);

      process.exit(0);
    }

    console.log("");
  }
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
