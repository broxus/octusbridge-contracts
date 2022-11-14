import { Ed25519KeyPair } from "nekoton-wasm";

const {
  setupBridge,
  setupEthereumEverscaleEventConfiguration,
  setupRelays,
  MetricManager,
  enableEventConfiguration,
  captureConnectors,
  logger,
} = require("../../../utils");

import { expect } from "chai";
import { Contract } from "locklift";
import {
  CellEncoderStandaloneAbi,
  EthereumEverscaleEventConfigurationAbi,
  FactorySource
} from "../../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";

let bridge: Contract<FactorySource["Bridge"]>;
let cellEncoder: Contract<FactorySource["CellEncoderStandalone"]>;
let staking: Contract<FactorySource["StakingMockup"]>;
let bridgeOwner: Account;
let metricManager: InstanceType<typeof MetricManager>;
let relays: Ed25519KeyPair[];
let ethereumEverscaleEventConfiguration: Contract<
  FactorySource["EthereumEverscaleEventConfiguration"]
>;
let proxy: Contract<FactorySource["ProxyTokenTransfer"]>;
let initializer: Account;
let initializerTokenWallet: Contract<FactorySource["TokenWallet"]>;

describe("Test ethereum everscale event reject", async function () {
  this.timeout(10000000);

  afterEach(async function () {
    const lastCheckPoint = metricManager.lastCheckPointName();
    const currentName = this.currentTest?.title;

    await metricManager.checkPoint(currentName);

    if (lastCheckPoint === undefined) return;

    const difference = await metricManager.getDifference(
      lastCheckPoint,
      currentName
    );

    for (const [contract, balanceDiff] of Object.entries(difference)) {
      if (balanceDiff !== 0) {
        logger.log(
          `[Balance change] ${contract} ${locklift.utils.fromNano(
            balanceDiff as number
          )} Everscale`
        );
      }
    }
  });

  it("Setup bridge", async () => {
    relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

    [ethereumEverscaleEventConfiguration, proxy, initializer] =
      await setupEthereumEverscaleEventConfiguration(
        bridgeOwner,
        staking,
        cellEncoder
      );

    metricManager = new MetricManager(
      bridge,
      bridgeOwner,
      staking,
      ethereumEverscaleEventConfiguration,
      proxy,
      initializer
    );
  });

  describe("Enable event configuration", async () => {
    it("Add event configuration to bridge", async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        ethereumEverscaleEventConfiguration.address,
        "ethereum"
      );
    });

    it("Check configuration enabled", async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations["0"]).to.be.not.equal(
        undefined,
        "Configuration not found"
      );

      expect(configurations["0"]._eventConfiguration.toString()).to.be.equal(
        ethereumEverscaleEventConfiguration.address.toString(),
        "Wrong configuration address"
      );

      expect(configurations["0"]._enabled).to.be.equal(
        true,
        "Wrong connector status"
      );
    });
  });

  type EncodeEthereumEverscaleEventDataParam = Parameters<
      Contract<CellEncoderStandaloneAbi>["methods"]["encodeEthereumEverscaleEventData"]
      >[0];
  type EventVoteDataParam = Parameters<
      Contract<EthereumEverscaleEventConfigurationAbi>["methods"]["deployEvent"]
      >[0]["eventVoteData"];

  let eventVoteData: EventVoteDataParam;
  let eventDataStructure: EncodeEthereumEverscaleEventDataParam;
  let eventContract: Contract<
      FactorySource["TokenTransferEthereumEverscaleEvent"]
      >;

  describe("Initialize event", async () => {
    eventDataStructure = {
      tokens: 100,
      wid: 0,
      owner_addr: 111,
    };

    it("Setup event data", async () => {
      const eventData = await cellEncoder.methods
        .encodeEthereumEverscaleEventData(eventDataStructure)
        .call()
        .then((t) => t.data);

      eventVoteData = {
        eventTransaction: 111,
        eventIndex: 222,
        eventData,
        eventBlockNumber: 333,
        eventBlock: 444,
      };
    });

    it("Initialize event", async () => {
      const tx = await ethereumEverscaleEventConfiguration.methods
        .deployEvent({
          eventVoteData,
        })
        .send({
          from: initializer.address,
          amount: locklift.utils.toNano(6),
        });

      logger.log(`Event initialization tx: ${tx.id}`);

      const expectedEventContract =
        await ethereumEverscaleEventConfiguration.methods
          .deriveEventAddress({
            eventVoteData: eventVoteData,
            answerId: 0,
          })
          .call();

      logger.log(`Expected event address: ${expectedEventContract.eventContract}`);

      eventContract = await locklift.factory.getDeployedContract(
        "TokenTransferEthereumEverscaleEvent",
        expectedEventContract.eventContract
      );
    });
  });

  describe("Reject event", async () => {
    it("Reject event enough times", async () => {
      const requiredVotes = await eventContract.methods
        .requiredVotes()
        .call()
        .then((t) => parseInt(t.requiredVotes, 10));

      const rejects = [];
      for (const [relayId, relay] of Object.entries(
        relays.slice(0, requiredVotes)
      )) {
        logger.log(`Reject #${relayId} from ${relay.publicKey}`);

        locklift.keystore.addKeyPair(relay);

        rejects.push(
          eventContract.methods
            .reject({
              voteReceiver: eventContract.address,
            })
            .sendExternal({
              publicKey: relay.publicKey,
            })
        );
      }
      await Promise.all(rejects);
    });

    it("Check event rejected", async () => {
      const details = await eventContract.methods
        .getDetails({ answerId: 0 })
        .call();

      const requiredVotes = await eventContract.methods
        .requiredVotes()
        .call()
        .then((t) => parseInt(t.requiredVotes, 10));

      expect(details.balance).to.be.equal("0", "Wrong balance");

      expect(details._status).to.be.equal("3", "Wrong status");

      expect(details._confirms).to.have.lengthOf(
        0,
        "Wrong amount of confirmations"
      );

      expect(details._rejects).to.have.lengthOf(
        requiredVotes,
        "Wrong amount of relays confirmations"
      );
    });
  });
});
