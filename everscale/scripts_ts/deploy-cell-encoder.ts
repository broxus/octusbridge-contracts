const {
  logContract,
} = require('../test/utils2');




const main = async () => {
  const [keyPair] = await locklift.keys.getKeyPairs();

  const CellEncoderStandalone = await locklift.factory.getContract('CellEncoderStandalone');

  const cellEncoderStandalone = await locklift.giver.deployContract({
    contract: CellEncoderStandalone,
    constructorParams: {},
    initParams: {},
    keyPair
  }, locklift.utils.convertCrystal(0.5, 'nano'));

  await logContract(cellEncoderStandalone);
};


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
