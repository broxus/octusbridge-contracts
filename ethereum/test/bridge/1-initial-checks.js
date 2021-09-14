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
    
    it('Check actual round payload decoding', async () => {
      const payload = '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000141000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000101010101010101010101010101010101010101000000000000000000000000000000000000000000000000000000000000007b00000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000270f0000000000000000000000000000000000000000000000000000000000000003000000000000000000000000010101010101010101010101010101010101010100000000000000000000000002020202020202020202020202020202020202020000000000000000000000000303030303030303030303030303030303030303';
  
      const decoded = await bridge.decodeRoundRelaysEventData(payload);
  
      expect(decoded.round)
        .to.be.equal(123, 'Wrong round number');
  
      expect(decoded._relays)
        .to.have.lengthOf(3, 'Wrong relays amount');
  
      expect(decoded.roundEnd)
        .to.be.equal(9999, 'Wrong round end');
    });
  });
});
