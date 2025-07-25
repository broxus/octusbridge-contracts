import { Address, toNano, WalletTypes } from "locklift";
import { BigNumber } from "bignumber.js";

const CELL_ENCODER_ADDRESS =
  "0:f6f40f44e8633d8184441df9d8663905cd0d13864db71863de27b3313f765b6f";
const PROXY =
  "0:abaef59990f979b2f42bfb3ebd85bbe4a9841dc1b489a9dbb3cd73244b95fee8";
const CHAIN_ID = 56; // BSC
const WALLET =
  new Address("0:6dc8199fc7ad4c84c64a6f3d2a18c874f2e924175897af81ed79ced1c26b4934");

const EVM_CALLBACK_PARAMS = { recipient: 0, strict: false, payload: "" };

const SENDER =
  new Address("0:2746d46337aa25d790c97f1aefb01a5de48cc1315b41a4f32753146a1e1aeb7d");
const RECIPIENT = "0x7a1cdAc618c584375A535f97141E08a60ED40ee4";
const AMOUNT = "1";

const main = async (): Promise<void> => {
  const cellEncoder = locklift.factory.getDeployedContract(
    "CellEncoderStandalone",
    new Address(CELL_ENCODER_ADDRESS)
  );

  await locklift.factory.accounts.addExistingAccount({
    type: WalletTypes.EverWallet,
    address: SENDER,
  });

  const params = {
    recipient: new BigNumber(RECIPIENT.toLowerCase(), 16).toString(10),
    chainId: CHAIN_ID,
    callback: EVM_CALLBACK_PARAMS,
  };

  console.log(
    "Calling encodeNativeTransferPayloadEthereum with params:",
    JSON.stringify(params, null, 2)
  );

  const payload = await cellEncoder.methods
    .encodeNativeTransferPayloadEthereum(params)
    .call()
    .then((t) => t.value0);

  console.log("Payload:", payload);
  console.log(
    `Transfer ${AMOUNT} tokens from ${SENDER} to native proxy ${PROXY}`
  );

  await locklift.factory.accounts.addExistingAccount({
    type: WalletTypes.EverWallet,
    address: SENDER,
  });

  const wallet = locklift.factory.getDeployedContract("TokenWallet", WALLET);

  const { extTransaction } = await locklift.transactions.waitFinalized(
    wallet.methods
      .transfer({
        amount: AMOUNT,
        recipient: new Address(PROXY),
        deployWalletValue: 0,
        remainingGasTo: SENDER,
        notify: true,
        payload: payload,
      })
      .send({ from: SENDER, amount: toNano(10), bounce: true }),
  );

  console.log(`Token transfer tx: ${extTransaction.id.hash}`);
};

main().then(() => console.log("Success"));
