export {};

import { Address } from "locklift";

const ethers = require("ethers");
const fs = require("fs");

const bridgeAddress = "0xc25CA21377C5bbC860F0bF48dF685D744A411489";
const rpc = "https://bsc-dataseed.binance.org/";
const eventContract =
  "0:da8ad5d6be01eb2bbbd8cbfce01951516ff6fc9870a10889b23ec706f3f11ede";

const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const bridge = new ethers.Contract(
    bridgeAddress,
    JSON.parse(fs.readFileSync("./../ethereum/abi/Bridge.json")),
    provider
  );

  const event = await locklift.factory.getDeployedContract(
    "MultiVaultEverscaleEVMEventNative",
    new Address(eventContract)
  );

  const details = await event.methods.getDetails({ answerId: 0 }).call();
  const roundNumber = await event.methods.round_number({}).call();
  const eventDataDecoded = await event.methods
    .getDecodedData({ answerId: 0 })
    .call();

  const eventDataEncoded = ethers.utils.defaultAbiCoder.encode(
    [
      "int8",
      "uint256",
      "string",
      "string",
      "uint8",
      "uint128",
      "uint160",
      "uint256",
    ],
    [
      eventDataDecoded.token_.toString().split(":")[0],
      `0x${eventDataDecoded.token_.toString().split(":")[1]}`,

      eventDataDecoded.name_,
      eventDataDecoded.symbol_,
      eventDataDecoded.decimals_,

      eventDataDecoded.amount_.toString(),
      eventDataDecoded.recipient_,
      eventDataDecoded.chainId_.toString(),
    ]
  );

  const configuration = await locklift.factory.getDeployedContract(
    "EverscaleEthereumEventConfiguration",
    details._eventInitData.configuration
  );

  // console.log(details);

  const configurationDetails = await configuration.methods
    .getDetails({ answerId: 0 })
    .call();

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
        configurationWid: details._eventInitData.configuration
          .toString()
          .split(":")[0],
        configurationAddress:
          "0x" + details._eventInitData.configuration.toString().split(":")[1],
        eventContractWid: eventContract.split(":")[0],
        eventContractAddress: "0x" + eventContract.split(":")[1],
        proxy: `0x${configurationDetails._networkConfiguration.proxy}`,
        round: roundNumber.toString(),
      },
    ]
  );

  let signatures = await Promise.all(
    details._signatures.map(async (sign) => {
      return {
        sign,
        address: ethers.BigNumber.from(
          await bridge.recoverSignature(encodedEvent, sign)
        ),
      };
    })
  );

  signatures = signatures.sort((a, b) => {
    if (a.address.eq(b.address)) {
      return 0;
    }
    if (a.address.gt(b.address)) {
      return 1;
    } else {
      return -1;
    }
  });

  // console.log(signatures);

  console.log(encodedEvent);
  console.log(`[${signatures.map((b) => "0x" + b.sign).join(",")}]`);
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
