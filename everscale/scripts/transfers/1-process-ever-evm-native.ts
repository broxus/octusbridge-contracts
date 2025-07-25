import { Address, Contract } from "locklift";
import { deriveBip39Phrase } from "everscale-crypto";
import { mapTonCellIntoEthBytes } from "eth-ton-abi-converter";
import { ethers } from "ethers";

import { MultiVaultEverscaleEVMEventNativeAbi } from "../../build/factorySource";
import { BigNumber } from "bignumber.js";

const loadRelays = (): string[] => {
  const mnemonicPath = process.env.RELAYS_MNEMONIC_PATH;

  for (const phrase of process.env.RELAYS_PHRASES!.split(",")) {
    const keyPair = deriveBip39Phrase(phrase, mnemonicPath!);

    locklift.keystore.addKeyPair(keyPair);
  }

  return process.env.RELAYS_PUBLIC_KEYS!.split(",");
};

const loadEvmRelays = (): ethers.Wallet[] => {
  const mnemonicPath = process.env.RELAYS_EVM_MNEMONIC_PATH!;

  return process.env
    .RELAYS_EVM_PHRASES!.split(",")
    .map(phrase => ethers.Wallet.fromMnemonic(phrase, mnemonicPath));
};

const main = async () => {
  const tonEthEventConfiguration = locklift.factory.getDeployedContract(
    "EverscaleEthereumEventConfiguration",
    new Address(process.env.TON_ETH_NATIVE_EVENT_CONFIGURATION!),
  );
  const tvmRelays = loadRelays();
  const evmRelays = loadEvmRelays();
  const relays: [string, ethers.Wallet][] = tvmRelays.map((r, i) => [r, evmRelays[i]]);

  const events = await tonEthEventConfiguration.getPastEvents({
    filter: "NewEventContract" as const,
  });

  const eventsToConfirm: Contract<MultiVaultEverscaleEVMEventNativeAbi>[] = [];

  for (const event of events.events) {
    const tonEthMultiVaultEventNative = locklift.factory.getDeployedContract(
      "MultiVaultEverscaleEVMEventNative",
      event.data.eventContract,
    );

    const status = await tonEthMultiVaultEventNative.methods
      .status()
      .call()
      .then(r => r.value0);

    console.log(`Event ${tonEthMultiVaultEventNative.address} status: ${status}`);

    if (status === "1") {
      eventsToConfirm.push(tonEthMultiVaultEventNative);
    }
  }

  for (const event of eventsToConfirm) {
    const configurationData = await tonEthEventConfiguration.getFields().then(r => r.fields!);
    const eventData = await event.getFields().then(r => r.fields!);

    const eventDataEncoded = mapTonCellIntoEthBytes(
      Buffer.from(configurationData.basicConfiguration.eventABI, "base64").toString(),
      eventData.eventInitData.voteData.eventData,
      configurationData.flags,
    );

    const hash = ethers.utils.solidityKeccak256([
        "uint64",
        "uint32",
        "bytes",
        "int8",
        "uint256",
        "int8",
        "uint256",
        "address",
        "uint32",
      ],
      [
        eventData.eventInitData.voteData.eventTransactionLt,
        eventData.eventInitData.voteData.eventTimestamp,
        eventDataEncoded,
        tonEthEventConfiguration.address.toString().split(":")[0],
        `0x${tonEthEventConfiguration.address.toString().split(":")[1]}`,
        event.address.toString().split(":")[0],
        `0x${event.address.toString().split(":")[1]}`,
        `0x${new BigNumber(configurationData.networkConfiguration.proxy).toString(16).padStart(40, "0")}`,
        eventData.round_number,
      ]);

    const messageHashBytes = ethers.utils.arrayify(hash!);

    for (const [tvmRelay, evmRelay] of relays) {
      if (eventData.signatures.find(e => new BigNumber(tvmRelay, 16).eq(e[0]))) {
        continue;
      }

      const signature = (await evmRelay.signMessage(messageHashBytes)).slice(2);

      console.log(`Relay ${tvmRelay} confirmed event ${event.address}: ${signature}`);

      await event.methods
        .confirm({
          signature: signature,
          voteReceiver: event.address,
        })
        .sendExternal({ publicKey: tvmRelay });
    }
  }
};

main().then(() => console.log("Success"));
