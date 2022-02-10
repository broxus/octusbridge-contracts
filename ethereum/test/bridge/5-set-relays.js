const {
  expect,
  defaultConfiguration,
  generateWallets,
  ...utils
} = require('../utils');


describe('Set next round relays', async () => {
  let bridge;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    bridge = await ethers.getContract('Bridge');
  });
  
  it('Set relays round configuration', async () => {
    const owner = await ethers.getNamedSigner('owner');
    
    await bridge
      .connect(owner)
      .setConfiguration(defaultConfiguration);
  });
  
  let payload, signatures, relays;
  
  it('Send payload & signatures', async () => {
    const initialRelays = utils.sortAccounts(await utils.getInitialRelays());
    
    relays = await generateWallets(initialRelays.length);
    
    // Next round, list of relays, round end timestamp
    const roundRelaysPayload = web3.eth.abi.encodeParameters(
      ['uint32', 'uint160[]', 'uint32'],
      [
        1,
        relays.map(r => utils.addressToU160(r.address)),
        Math.floor(Date.now() / 1000) + 604800 // 1 week
      ]
    );
    
    payload = utils.encodeEverscaleEvent({
      eventData: roundRelaysPayload,
      proxy: bridge.address,
    });
    
    const { requiredSignatures } = await bridge.rounds(0);
  
    signatures = await Promise.all(
      initialRelays
      .slice(0, requiredSignatures)
      .map(async (account) => utils.signReceipt(payload, account))
    );
    
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
    const { requiredSignatures } = await bridge.rounds(1);
    
    expect(requiredSignatures)
      .to.be.greaterThan(0, 'Too low required signatures')
      .to.be.lessThanOrEqual(relays.length, 'Too high required signatures');
  });
  
  it('Try to reuse payload', async () => {
    await expect(bridge.setRoundRelays(payload, signatures))
      .to.be.revertedWith('Cache: payload already seen');
  });
});
