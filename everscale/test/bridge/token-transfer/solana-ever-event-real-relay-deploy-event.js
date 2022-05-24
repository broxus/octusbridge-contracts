const {
  logger,
} = require('../../utils');


describe('Cell encoder', async function() {
  this.timeout(10000000);

  describe('Cell encoder', async () => {

    it('Cell encoder', async () => {
      const [keyPair] = await locklift.keys.getKeyPairs();
      const CellEncoder = await locklift.factory.getContract('CellEncoderStandalone');

      const cellEncoder = await locklift.giver.deployContract({
        contract: CellEncoder,
        keyPair,
      }, locklift.utils.convertCrystal(1, 'nano'));

      logger.log(cellEncoder.address);

    });

  });

});
