const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('ton-testing-suite');


let EventEmitter;


const tonWrapper = new freeton.TonWrapper({
  network: process.env.TON_NETWORK,
  seed: process.env.TON_SEED,
  messageExpirationTimeout: 240000,
  waitForTimeout: 60000,
  debug: Boolean(process.env.TON_WRAPPER_DEBUG),
});


describe('Test event emitter', async function() {
  this.timeout(12000000);

  before(async function() {
    await tonWrapper.setup();

    EventEmitter = await freeton.requireContract(tonWrapper, 'EventEmitter');
    await EventEmitter.loadMigration();

    logger.log(`Event emitter address: ${EventEmitter.address}`);
  });

  it('Emit event', async function() {
    await EventEmitter.run('setState', {
      _state: 777,
    });

    const {
      value: {
        state,
      }
    } = (await EventEmitter.getEvents('TONStateChange')).pop();

    expect(parseInt(state)).to.equal(777, 'Wrong emitted state');
  });
});
