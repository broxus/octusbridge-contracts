const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('ton-testing-suite');
const _ = require('underscore');
const utils = require('./utils');


const BigNumber = require('bignumber.js');
BigNumber.config({ EXPONENTIAL_AT: 257 });


let Bridge;
let newRelayAccount;
let target;


const giverConfig = {
  address: process.env.TON_GIVER_CONTRACT,
  abi: JSON.parse(process.env.TON_GIVER_ABI),
};

const tonWrapper = new freeton.TonWrapper({
  network: process.env.TON_NETWORK,
  seed: process.env.TON_SEED,
  giverConfig,
  messageExpirationTimeout: 240000,
  waitForTimeout: 60000,
  debug: Boolean(process.env.TON_WRAPPER_DEBUG),
});

const relaysManager = new utils.RelaysManager(
  parseInt(process.env.RELAYS_AMOUNT),
  tonWrapper,
);


const convertAddressToWidAndAddr = (addr) => {
  return {
    wid: addr.split(':')[0],
    addr: new BigNumber(`0x${addr.split(':')[1]}`)
  }
};


describe('Test Bridge relay update', async function() {
  this.timeout(12000000);

  before(async function() {
    await tonWrapper.setup();
    await relaysManager.setup();

    Bridge = await freeton
      .requireContract(tonWrapper, 'Bridge');
    await Bridge.loadMigration();

    logger.log(`Bridge address: ${Bridge.address}`);

    newRelayAccount = await freeton.requireContract(tonWrapper, 'RelayAccount');
    await newRelayAccount.deploy(
      {},
      {},
      freeton.utils.convertCrystal('10', 'nano'),
      true
    );
    
    logger.log(`New relay account: ${newRelayAccount.address}`);
  });

  describe('Grant ownership', async function() {
    target = {
      ...convertAddressToWidAndAddr(newRelayAccount.address),
      ethereumAccount: 123,
      action: true,
    };
  
    it('Initial check', async () => {
      const accountOwnership = await Bridge.runLocal('getAccountStatus', { addr: newRelayAccount.address });

      expect(accountOwnership).to.equal(false, 'Account should not have ownership');
    });

    it('Reject not enough times', async function() {
      const {
        bridgeRelayUpdateRequiredRejects,
      } = await Bridge.runLocal('getDetails');
      
      for (const keyId of _.range(bridgeRelayUpdateRequiredRejects.toNumber() - 1)) {
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'updateBridgeRelays',
          input: {
            target,
            _vote: {
              signature: freeton.utils.stringToBytesArray(''),
            },
          }
        }, keyId);
      }

      const {
        confirmRelays,
        rejectRelays,
      } = await Bridge.runLocal('getBridgeRelayVotes', {
        target
      });

      expect(confirmRelays).to.have.lengthOf(0, 'Wrong amount of confirmations');
      expect(rejectRelays)
        .to
        .have
        .lengthOf(bridgeRelayUpdateRequiredRejects.toNumber() - 1, 'Wrong amount of confirmations');
    });

    it('Confirm enough times', async function() {
      const {
        bridgeRelayUpdateRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');

      for (const keyId of _.range(bridgeRelayUpdateRequiredConfirmations.toNumber())) {
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'updateBridgeRelays',
          input: {
            target,
            _vote: {
              signature: freeton.utils.stringToBytesArray('123'),
            },
          },
        }, keyId);
      }

      const {
        confirmRelays,
        rejectRelays,
      } = await Bridge.runLocal('getBridgeRelayVotes', {
        target
      });

      expect(confirmRelays).to.have.lengthOf(0, 'Wrong amount of confirmations');
      expect(rejectRelays).to.have.lengthOf(0, 'Wrong amount of rejects');

      const accountOwnership = await Bridge.runLocal('getAccountStatus', { addr: newRelayAccount.address });

      expect(accountOwnership).to.equal(true, 'Account should have ownership');
    });
  });

  describe('Remove ownership', async function() {
    target = {
      ...convertAddressToWidAndAddr(newRelayAccount.address),
      ethereumAccount: 123,
      action: false,
    };

    it('Confirm enough times', async function() {
      const {
        bridgeRelayUpdateRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');

      for (const keyId of _.range(bridgeRelayUpdateRequiredConfirmations.toNumber())) {
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'updateBridgeRelays',
          input: {
            target,
            _vote: {
              signature: freeton.utils.stringToBytesArray('123'),
            },
          },
        }, keyId);
      }

      const {
        confirmRelays,
        rejectRelays,
      } = await Bridge.runLocal('getBridgeRelayVotes', {
        target
      });

      expect(confirmRelays).to.have.lengthOf(0, 'Wrong amount of confirmations');
      expect(rejectRelays).to.have.lengthOf(0, 'Wrong amount of rejects');

      const accountOwnership = await Bridge.runLocal('getAccountStatus', { addr: newRelayAccount.address });

      expect(accountOwnership).to.equal(false, 'Account should  not have ownership');
    });
  });
});
