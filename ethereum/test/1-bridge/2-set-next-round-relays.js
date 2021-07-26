const {
  logger,
  expect,
  ...utils
} = require('./../utils');

const _ = require('underscore');


const generateRelays = async (amount) => Promise.all(_
  .range(amount)
  .map(async () => ethers.Wallet.createRandom())
);


describe('Set next round relays', async () => {
  let bridge;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    bridge = await ethers.getContract('Bridge');
  });
  
  describe('Set next round relays', async () => {
    let payload, signatures, relays;

    it('Send payload & signatures by initial relays', async () => {
      const requiredSignatures = await bridge.configuration();
      
      relays = await generateRelays(requiredSignatures + 1);

      const roundRelaysPayload = web3.eth.abi.encodeParameters(
        ['uint32', 'uint160[]'],
        [1, relays.map(r => utils.addressToU160(r.address))]
      );

      payload = utils.encodeTonEvent({
        eventData: roundRelaysPayload,
        proxy: bridge.address,
      });

      const initialRelays = utils.sortAccounts(await ethers.getSigners());
      
      signatures = await Promise.all(initialRelays
        .map(async (account) => utils.signReceipt(payload, account)));

      await bridge.setRoundRelays(payload, signatures);
    });
    
    it('Check new round initialized', async () => {
      expect(await bridge.lastRound())
        .to.be.equal(1, 'Wrong last round');
    });
    
    it('Check relays authorized for new round', async () => {
      for (const relay of relays) {
        expect(await bridge.isRelay(1, relay.address))
          .to.be.equal(true, 'Wrong relay status');
      }
    });
  
    it('Check required signatures for the next round', async () => {
      expect(await bridge.roundRequiredSignatures(1))
        .to.be.greaterThan(0, 'Too low required signatures')
        .to.be.lessThanOrEqual(relays.length, 'Too high required signatures');
    });
    
    it('Try to reuse payload', async () => {
      expect(bridge.setRoundRelays(payload, signatures))
        .to.be.revertedWith('Cache: payload already seen');
    });
  });
});
