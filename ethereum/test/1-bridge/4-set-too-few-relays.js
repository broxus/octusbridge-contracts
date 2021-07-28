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


describe('Set too few relays for the next round', async () => {
  let bridge;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    bridge = await ethers.getContract('Bridge');
  });
  
  describe('Set too few next round relays', async () => {
    let payload, signatures;
    
    it('Prepare payload & signatures', async () => {
      const requiredSignatures = await bridge.configuration();
      
      const newRelays = await generateRelays(requiredSignatures + 1);
      
      const roundRelaysPayload = web3.eth.abi.encodeParameters(
        ['uint32', 'uint160[]'],
        [1, newRelays.map(r => utils.addressToU160(r.address)).slice(0, requiredSignatures - 1)]
      );
      
      payload = utils.encodeTonEvent({
        eventData: roundRelaysPayload,
        proxy: bridge.address,
      });
      
      const initialRelays = utils.sortAccounts(await ethers.getSigners());
      
      signatures = await Promise.all(initialRelays
        .map(async (account) => utils.signReceipt(payload, account)));
    });
    
    it('Try to set next round relays', async () => {
      expect(bridge.setRoundRelays(payload, signatures))
        .to.be.revertedWith('Bridge: too low required signatures');
    });
  });
});
