const {
  expect,
  defaultConfiguration,
  generateWallets,
  ...utils
} = require('../utils');


describe('Try to set next round relays with too few signatures', async () => {
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
    const minimumRequiredSignatures = await bridge.minimumRequiredSignatures();
    
    const relays = await generateWallets(minimumRequiredSignatures * 2);
    
    // Next round, list of relays, round end timestamp
    const roundRelaysPayload = web3.eth.abi.encodeParameters(
      ['uint32', 'uint160[]', 'uint32'],
      [
        1,
        relays.map(r => utils.addressToU160(r.address)),
        Math.floor(Date.now() / 1000) + 604800 // 1 week
      ]
    );
    
    const payload = utils.encodeEverscaleEvent({
      eventData: roundRelaysPayload,
      proxy: bridge.address,
    });
    
    const initialRelays = utils.sortAccounts(await utils.getInitialRelays());
  
    const { requiredSignatures } = await bridge.rounds(0);
    
    const signatures = await Promise.all(
      initialRelays
      .slice(0, requiredSignatures - 1) // dev: 1 signature less than required
      .map(async (account) => utils.signReceipt(payload, account))
    );
    
    await expect(bridge.setRoundRelays(payload, signatures))
      .to.be.revertedWith("Bridge: signatures verification failed");
  });
});
