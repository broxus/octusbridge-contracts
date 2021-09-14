const {
  expect,
  getInitialRelays,
} = require('../utils');


describe('Test bridge initial setup', async function() {
  let bridge;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    bridge = await ethers.getContract('Bridge');
  });
  
  describe('Initial checks', async () => {
    it('Check last round is 0', async () => {
      expect(await bridge.lastRound())
        .to.be.equal(0, 'Wrong last round');
    });

    it('Check required signatures for initial round', async () => {
      const relays = await ethers.getSigners();
      const round = await bridge.rounds(0);

      expect(round.requiredSignatures)
        .to.be.greaterThan(0, 'Too low required signatures')
        .to.be.lessThanOrEqual(relays.length, 'Too high required signatures');
    });

    it('Check relays for initial round', async () => {
      const relays = await getInitialRelays();

      for (const relay of relays) {
        expect(await bridge.isRelay(0, relay.address))
          .to.be.equal(true, 'Wrong relay status');
      }
    });
    
    it('Check initial round is not rotten', async () => {
      expect(await bridge.isRoundRotten(0))
        .to.be.equal(false, 'Initial round should not be rotten');
    });
    
    it('Check initial minimum required signatures', async () => {
    
    });
    
    it('Check initial emergency status', async () => {
    
    });
    
    it('Check initial round ttl', async () => {
    
    });
  });
});
