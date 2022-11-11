export {};

const { logContract } = require("../test/utils");

const main = async () => {
  const signer = (await locklift.keystore.getSigner("0"))!;

  const { contract: cellEncoderStandalone } =
    await locklift.factory.deployContract({
      contract: "CellEncoderStandalone",
      constructorParams: {},
      initParams: { _randomNonce: locklift.utils.getRandomNonce() },
      publicKey: signer.publicKey,
      value: locklift.utils.toNano(0.5),
    });

  await logContract(
    "cellEncoderStandalone address",
    cellEncoderStandalone.address
  );
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
