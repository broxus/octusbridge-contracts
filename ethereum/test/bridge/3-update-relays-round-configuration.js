const {
  expect,
  defaultConfiguration,
} = require('./../utils');


describe('Test updating relays round configuration', async () => {
  let bridge;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
  
    bridge = await ethers.getContract('Bridge');
  });
  
  it('Try to update relays round configuration by stranger', async () => {
    const stranger = await ethers.getNamedSigner('stranger');
    
  });
  
  it('Update relays round configuration by owner', async () => {
    const owner = await ethers.getNamedSigner('owner');
  
    await bridge
      .connect(owner)
      .setConfiguration(defaultConfiguration);
  
    const configuration = await bridge.roundRelaysConfiguration();
  
    expect(configuration.wid)
      .to.be.equal(defaultConfiguration.wid, 'Wrong new configuration wid');
  
    expect(configuration.addr)
      .to.be.equal(defaultConfiguration.addr, 'Wrong new configuration address');
  });
});
