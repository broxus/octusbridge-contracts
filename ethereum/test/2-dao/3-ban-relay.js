const {
  logger,
  expect,
  ...utils
} = require('../utils');


describe('Ban relay', async () => {
  let bridge, dao;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    bridge = await ethers.getContract('Bridge');
    dao = await ethers.getContract('DAO');
    
    logger.log(`Bridge: ${bridge.address}`);
    logger.log(`DAO: ${dao.address}`);
  });
  
  describe('Ban relay', async () => {
    let relaysToBan;
    let payload, signatures;

    it('Prepare payload & signatures', async () => {
      relaysToBan = (await ethers.getSigners())
        .slice(0, 2)
        .map(a => a.address);
  
      const {
        data: actionData
      } = await bridge.populateTransaction.banRelays(relaysToBan);
  
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
    
    it('Check relays banned', async () => {
      for (const relay of relaysToBan) {
        expect(await bridge.isBanned(relay))
          .to.be.equal(true, 'Relay should be banned');
      }
    });
  });
});
