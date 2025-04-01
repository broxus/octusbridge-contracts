import { Address, Contract } from "locklift";
import { deriveBip39Phrase } from "everscale-crypto";

import { MultiVaultEVMEverscaleEventNativeAbi } from "../../build/factorySource";
import { BigNumber } from "bignumber.js";

const loadRelays = (): string[] => {
  const mnemonicPath = process.env.RELAYS_MNEMONIC_PATH;

  for (const phrase of process.env.RELAYS_PHRASES!.split(",")) {
    const keyPair = deriveBip39Phrase(phrase, mnemonicPath!);

    locklift.keystore.addKeyPair(keyPair);
  }

  return process.env.RELAYS_PUBLIC_KEYS!.split(",");
};

const main = async () => {
  const tonEthEventConfiguration = locklift.factory.getDeployedContract(
    "EthereumEverscaleEventConfiguration",
    new Address(process.env.ETH_TON_NATIVE_EVENT_CONFIGURATION!),
  );
  const relays = loadRelays();

  const events = await tonEthEventConfiguration.getPastEvents({
    filter: "NewEventContract" as const,
  });

  const eventsToConfirm: Contract<MultiVaultEVMEverscaleEventNativeAbi>[] = [];

  for (const event of events.events) {
    const evmTonMultiVaultEventNative = locklift.factory.getDeployedContract(
      "MultiVaultEVMEverscaleEventNative",
      event.data.eventContract,
    );

    const status = await evmTonMultiVaultEventNative.methods
      .status()
      .call()
      .then(r => r.value0);

    console.log(`Event ${evmTonMultiVaultEventNative.address} status: ${status}`);

    if (status === "1") {
      eventsToConfirm.push(evmTonMultiVaultEventNative);
    }
  }

  for (const event of eventsToConfirm) {
    const eventData = await event.getFields().then(r => r.fields!);

    for (const relay of relays) {
      if (eventData.votes.find(e => new BigNumber(relay, 16).eq(e[0]) && +e[1] === 2)) {
        continue;
      }

      await event.methods
        .confirm({
          voteReceiver: event.address,
        })
        .sendExternal({ publicKey: relay });

      console.log(`Relay ${relay} confirmed event ${event.address}`);
    }
  }
};

main().then(() => console.log("Success"));
