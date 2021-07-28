const {
  logger,
  expect,
  ...utils
} = require('../utils');


describe('Update bridge configuration with dao', async () => {
  let bridge, dao;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    bridge = await ethers.getContract('Bridge');
    dao = await ethers.getContract('DAO');
    
    logger.log(`Bridge: ${bridge.address}`);
    logger.log(`DAO: ${dao.address}`);
  });
  
  describe('Update bridge configuration', async () => {
    const newConfiguration = {
      requiredSignatures: 6,
    };
    
    let payload, signatures;
    
    it('Prepare payload & signatures', async () => {
      const {
        data: actionData
      } = await bridge.populateTransaction.setConfiguration(newConfiguration);
  
      const actions = utils.encodeDaoActions([{
        target: bridge.address,
        data: actionData
      }]);

      payload = utils.encodeTonEvent({
        eventData: actions,
        proxy: dao.address,
      });
  
      const initialRelays = utils.sortAccounts(await ethers.getSigners());
  
      signatures = await Promise.all(initialRelays
        .map(async (account) => utils.signReceipt(payload, account)));
    });
    
    it('Execute', async () => {
      await dao.execute(payload, signatures);
    });
    
    it('Check new bridge configuration', async () => {
      const configuration = await bridge.configuration();

      expect(configuration)
        .to.be.equal(newConfiguration.requiredSignatures, 'Wrong configuration');
    });
    
    it('Try to reuse payload', async () => {
      expect(dao.execute(payload, signatures))
        .to.be.revertedWith('Cache: payload already seen');
    });
  });
});
