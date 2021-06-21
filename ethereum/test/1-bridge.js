const {
  signReceipt,
  logger,
  expect,
  sortAccounts
} = require('./utils');

const _ = require('underscore');


describe('Test bridge', async function() {
  let bridge, owner, initialRelays;

  const configuration = {
    requiredSignatures: 5,
  };
  
  describe('Setup bridge', async () => {
    it('Deploy bridge', async () => {
      [,owner] = await ethers.getSigners();

      initialRelays = await Promise.all(_
        .range(configuration.requiredSignatures + 1)
        .map(async () => ethers.Wallet.createRandom())
      );
      
      // Sort accounts by their address low-high
      initialRelays = sortAccounts(initialRelays);
      
      const Bridge = await ethers.getContractFactory("Bridge");
      
      bridge = await upgrades.deployProxy(
        Bridge,
        [
          owner.address,
          configuration,
          initialRelays.map(account => account.address),
        ]
      );
      
      logger.log(`Bridge: ${bridge.address}`);
    });
    
    it('Check ownership', async () => {
      expect(await bridge.owner())
        .to.be.equal(owner.address, 'Wrong owner');
    });
    
    it('Check initial round', async () => {
      expect(await bridge.lastRound())
        .to.be.equal(0, 'Wrong last round');
      
      for (const relay of initialRelays) {
        expect(await bridge.isRelay(0, relay.address))
          .to.be.equal(true, 'Wrong relay status');
      }
      
      expect(await bridge.roundRequiredSignatures(0))
        .to.be.greaterThan(0, 'Too low required signatures')
        .to.be.lessThanOrEqual(initialRelays.length, 'Too high required signatures');
    });
  });
  
  describe('Set round relays', async () => {
    it('Set next round relays', async () => {
      await bridge.connect(owner).setRoundRelays(
        1,
        initialRelays.map(account => account.address),
      );
      
      expect(await bridge.lastRound())
        .to.be.equal(1, 'Wrong last round');
  
      for (const relay of initialRelays) {
        expect(await bridge.isRelay(1, relay.address))
          .to.be.equal(true, 'Wrong relay status');
      }
  
      expect(await bridge.roundRequiredSignatures(1))
        .to.be.greaterThan(0, 'Too low required signatures')
        .to.be.lessThanOrEqual(initialRelays.length, 'Too high required signatures');
    });
    
    it('Set new round relays with non-owner', async () => {
      expect(bridge.setRoundRelays(2,
        initialRelays.map(account => account.address),
      )).to.be.revertedWith('Ownable: caller is not the owner');
    });
    
    it('Set relays for too far round', async () => {
      expect(bridge.connect(owner).setRoundRelays(100,
        initialRelays.map(account => account.address),
      )).to.be.revertedWith('Bridge: wrong round');
    });
  });

  describe('Set configuration', async () => {
    const newConfiguration = {
      requiredSignatures: 6,
    };

    it('Update configuration', async () => {
      await bridge.connect(owner)
        .setConfiguration(newConfiguration);
    });

    it('Check new configuration', async () => {
      const configuration = await bridge.configuration();

      expect(configuration)
        .to.be.equal(newConfiguration.requiredSignatures, 'Wrong configuration');
    });

    it('Update configuration with non-owner', async () => {
      await expect(bridge.setConfiguration(newConfiguration))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
