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


describe('Set next round relays with too few signatures', async () => {
  let bridge;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    bridge = await ethers.getContract('Bridge');
  });
  
  describe('Set next round relays with less signatures than required', async () => {
    let payload, signatures;
    
    it('Prepare payload & signatures', async () => {
      const requiredSignatures = await bridge.configuration();
  
      const newRelays = await generateRelays(requiredSignatures + 1);
  
      const roundRelaysPayload = web3.eth.abi.encodeParameters(
        ['uint32', 'uint160[]'],
        [1, newRelays.map(r => utils.addressToU160(r.address))]
      );
  
      payload = utils.encodeTonEvent({
        eventData: roundRelaysPayload,
        proxy: bridge.address,
        chainId: 1,
      });
  
      const initialRelays = utils.sortAccounts(await ethers.getSigners());
  
      signatures = (await Promise.all(initialRelays
        .map(async (account) => utils.signReceipt(payload, account))))
        .slice(0, requiredSignatures);
    });
    
    it('Try to set next round relays', async () => {
      expect(bridge.setRoundRelays(payload, signatures))
        .to.be.revertedWith('Bridge: signatures verification failed');
    });
  });
});
