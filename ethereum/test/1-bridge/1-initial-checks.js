const {
  logger,
  expect,
} = require('../utils');


describe('Test bridge initial setup', async function() {
  let bridge;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    bridge = await ethers.getContract('Bridge');
  });
  
  describe('Initial checks', async () => {
    it('Check initial round initialized', async () => {
      expect(await bridge.lastRound())
        .to.be.equal(0, 'Wrong last round');
    });
    
    it('Check required signatures for initial round', async () => {
      const relays = await ethers.getSigners();

      expect(await bridge.roundRequiredSignatures(0))
        .to.be.greaterThan(0, 'Too low required signatures')
        .to.be.lessThanOrEqual(relays.length, 'Too high required signatures');
    });
    
    it('Check relays for initial round', async () => {
      const relays = await ethers.getSigners();
  
      for (const relay of relays) {
        expect(await bridge.isRelay(0, relay.address))
          .to.be.equal(true, 'Wrong relay status');
      }
    });
  });
});
