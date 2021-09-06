const {
  expect,
  defaultConfiguration,
  generateWallets,
  ...utils
} = require('../utils');


describe('Try to set too few relays for the next round', async () => {
  let bridge;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    bridge = await ethers.getContract('Bridge');
  });
  
  it('Set relays round configuration', async () => {
    const owner = await ethers.getNamedSigner('owner');
    
    await bridge
      .connect(owner)
      .updateRoundRelaysConfiguration(defaultConfiguration);
  });
  
  it('Send payload & signatures', async () => {
    const relays = await generateWallets(1);
    
    // Next round, list of relays, round end timestamp
    const roundRelaysPayload = web3.eth.abi.encodeParameters(
      ['uint32', 'uint160[]', 'uint32'],
      [
        1,
        relays.map(r => utils.addressToU160(r.address)),
        Math.floor(Date.now() / 1000) + 604800 // 1 week
      ]
    );
    
    const payload = utils.encodeTonEvent({
      eventData: roundRelaysPayload,
      proxy: bridge.address,
    });
    
    const initialRelays = utils.sortAccounts(await ethers.getSigners());
  
    const { requiredSignatures } = await bridge.rounds(0);
  
    const signatures = await Promise.all(
      initialRelays
      .slice(0, requiredSignatures)
      .map(async (account) => utils.signReceipt(payload, account))
    );
    
    await expect(bridge.setRoundRelays(payload, signatures))
      .to.be.revertedWith("Bridge: round required signatures is less than minimum'");
  });
});
