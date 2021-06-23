const {
  signReceipt,
  logger,
  expect,
  sortAccounts,
} = require('./utils');

const _ = require('underscore');
const BigNumber = require('bignumber.js');


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
    let payload, signatures;
    
    it('Prepare payload & signatures for next round relays', async () => {
      const roundRelaysPayload = web3.eth.abi.encodeParameters(
        ['uint32', 'uint160[]'],
        [1, initialRelays.map(r => (new BigNumber(r.address.toLowerCase())).toString(10))]
      );
  
      payload = web3.eth.abi.encodeParameters(
        [{
          'TONEvent': {
            'eventTransaction': 'uint256',
            'eventTransactionLt': 'uint64',
            'eventTimestamp': 'uint32',
            'eventIndex': 'uint32',
            'eventData': 'bytes',
            'configurationWid': 'int8',
            'configurationAddress': 'uint256',
            'proxy': 'address',
            'round': 'uint32',
            'chainId': 'uint32',
          }
        }],
        [{
          'eventTransaction': 0,
          'eventTransactionLt': 0,
          'eventTimestamp': 0,
          'eventIndex': 0,
          'eventData': roundRelaysPayload,
          'configurationWid': 0,
          'configurationAddress': 0,
          'proxy': bridge.address,
          'round': 0,
          'chainId': 1,
        }]
      );
  
      signatures = await Promise.all(initialRelays
        .map(async (account) => signReceipt(web3, payload, account)));
    });
    
    it('Check new round relays', async () => {
      await bridge.setRoundRelays(payload, signatures);
  
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
    
    it('Repeat already used payload & signatures', async () => {
      expect(bridge.setRoundRelays(payload, signatures))
        .to.be.revertedWith('Cache: payload already seen');
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
