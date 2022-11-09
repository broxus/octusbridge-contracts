const {
  logger,
} = require('../../../utils');


describe('Cell encoder', async function() {
  this.timeout(10000000);

  describe('Cell encoder', async () => {

    it('Cell encoder', async () => {
      const signer = (await locklift.keystore.getSigner("0"))!;

      const {contract: cellEncoder} = await locklift.factory.deployContract({
        contract: 'CellEncoderStandalone',
        constructorParams: {},
        initParams: {
          _randomNonce: locklift.utils.getRandomNonce(),
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1),
      });

      logger.log(cellEncoder.address);

    });

  });

});
