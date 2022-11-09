import {Ed25519KeyPair} from "nekoton-wasm";

const {
  setupBridge,
  setupSolanaEverscaleEventConfiguration,
  setupRelays,
  MetricManager,
  enableEventConfiguration,
  captureConnectors,
  logger,
} = require('../../../utils');

import { expect } from "chai";
import { Contract } from "locklift";
import { FactorySource } from "../../../../build/factorySource";
import {Account} from "everscale-standalone-client/nodejs";

let bridge: Contract<FactorySource["Bridge"]>;
let cellEncoder: Contract<FactorySource["CellEncoderStandalone"]>;
let staking: Contract<FactorySource["StakingMockup"]>;
let bridgeOwner: Account;
let metricManager: InstanceType<typeof MetricManager>;
let relays: Ed25519KeyPair[];
let solanaEverscaleEventConfiguration: Contract<FactorySource["SolanaEverscaleEventConfiguration"]>;
let proxy: Contract<FactorySource["ProxyTokenTransfer"]>;
let initializer: Account;

describe('Test solana everscale event reject', async function() {
  this.timeout(10000000);

  afterEach(async function() {
    const lastCheckPoint = metricManager.lastCheckPointName();
    const currentName = this.currentTest?.title;

    await metricManager.checkPoint(currentName);

    if (lastCheckPoint === undefined) return;

    const difference = await metricManager.getDifference(lastCheckPoint, currentName);

    for (const [contract, balanceDiff] of Object.entries(difference)) {
      if (balanceDiff !== 0) {
        logger.log(`[Balance change] ${contract} ${locklift.utils.fromNano(balanceDiff as number)} Everscale`);
      }
    }
  });

  it('Setup bridge', async () => {
    relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

    [solanaEverscaleEventConfiguration, proxy, initializer] = await setupSolanaEverscaleEventConfiguration(
      bridgeOwner,
      staking
    );

    metricManager = new MetricManager(
      bridge, bridgeOwner, staking,
      solanaEverscaleEventConfiguration, proxy, initializer
    );
  });

  describe('Enable event configuration', async () => {
    it('Add event configuration to bridge', async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        solanaEverscaleEventConfiguration,
        'solana'
      );
    });

    it('Check configuration enabled', async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations['0'])
        .to.be.not.equal(undefined, 'Configuration not found');

      expect(configurations['0']._eventConfiguration)
        .to.be.equal(solanaEverscaleEventConfiguration.address, 'Wrong configuration address');

      expect(configurations['0']._enabled)
        .to.be.equal(true, 'Wrong connector status');
    });
  });

  let eventVoteData: any;
  let eventDataStructure: any;
  let eventContract: Contract<FactorySource["TokenTransferSolanaEverscaleEvent"]>;

  describe('Initialize event', async () => {

    it('Setup event data', async () => {

      eventDataStructure = {
        sender_addr: 123,
        tokens: 100,
        receiver_addr: initializer.address
      };

      const eventData = await cellEncoder.methods.encodeSolanaEverscaleEventData(eventDataStructure).call().then(t => t.data);

      eventVoteData = {
          accountSeed: 111,
          slot: 0,
          blockTime: 0,
          txSignature: '',
          eventData,
      };
    });

    it('Initialize event', async () => {
      const tx = await solanaEverscaleEventConfiguration.methods.deployEvent({
        eventVoteData,
      }).send({
        from: initializer.address,
        amount: locklift.utils.toNano(3),
      });

      logger.log(`Event initialization tx: ${tx.id}`);

      const expectedEventContract = await solanaEverscaleEventConfiguration.methods.deriveEventAddress(eventVoteData).call();

      logger.log(`Expected event address: ${expectedEventContract.eventContract}`);

      eventContract = await locklift.factory.getDeployedContract('TokenTransferSolanaEverscaleEvent', expectedEventContract.eventContract);
    });
  });

  describe('Reject event', async () => {
    it('Reject event enough times', async () => {
      const requiredVotes = await eventContract.methods.requiredVotes().call();

      const rejects = [];
      for (const [relayId, relay] of Object.entries(relays.slice(0, parseInt(requiredVotes.requiredVotes, 10)))) {
        logger.log(`Reject #${relayId} from ${relay.publicKey}`);

        locklift.keystore.addKeyPair(relay);

        rejects.push(eventContract.methods.reject({
          voteReceiver: eventContract.address,
        }).sendExternal({
          publicKey: relay.publicKey,
        }));
      }
      await Promise.all(rejects);
    });

    it('Check event rejected', async () => {
      const details = await eventContract.methods.getDetails({answerId: 0}).call();

      const requiredVotes = await eventContract.methods.requiredVotes().call();


      expect(details.balance)
        .to.be.equal(0, 'Wrong balance');

      expect(details._status)
        .to.be.equal(3, 'Wrong status');

      expect(details._confirms)
        .to.have.lengthOf(0, 'Wrong amount of confirmations');

      expect(details._rejects)
        .to.have.lengthOf(parseInt(requiredVotes.requiredVotes, 10), 'Wrong amount of relays confirmations');
    });
  });
});
