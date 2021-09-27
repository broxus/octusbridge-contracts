const {
  expect
} = require('./../utils');


describe('Set relays with round submitter', async () => {
  let bridge;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    bridge = await ethers.getContract('Bridge');
  });
  
  it('Try to set round with stranger', async () => {
    const stranger = await ethers.getNamedSigner('stranger');
  
    await expect(bridge
      .connect(stranger)
      .forceRoundRelays([], 0)
    ).to.be.revertedWith("Bridge: sender not round submitter");
  });
  
  it('Set relays with round submitter', async () => {
    const roundSubmitter = await ethers.getNamedSigner('roundSubmitter');
  
    expect(await bridge.lastRound())
      .to.be.equal(0, 'Wrong last number');
  
    await bridge
      .connect(roundSubmitter)
      .forceRoundRelays([], 0);
    
    expect(await bridge.lastRound())
      .to.be.equal(1, 'Wrong last number');
  });
});
