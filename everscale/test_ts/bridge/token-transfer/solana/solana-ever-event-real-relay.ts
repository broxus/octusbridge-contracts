import { Ed25519KeyPair } from "nekoton-wasm";
const {
  setupBridge,
  setupSolanaEverscaleEventConfigurationReal,
  MetricManager,
  enableEventConfiguration,
  captureConnectors,
  logger,
  getTokenWalletByAddress,
} = require("../../../utils");
import BigNumber from "bignumber.js";

import { expect } from "chai";
import { Contract } from "locklift";
import { FactorySource } from "../../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";

let bridge: Contract<FactorySource["Bridge"]>;
let cellEncoder: Contract<FactorySource["CellEncoderStandalone"]>;
let staking: Contract<FactorySource["StakingMockup"]>;
let bridgeOwner: Account;
let metricManager: InstanceType<typeof MetricManager>;
let relays: Ed25519KeyPair[];
let solanaEverscaleEventConfiguration: Contract<
  FactorySource["SolanaEverscaleEventConfiguration"]
>;
let everscaleSolanaEventConfiguration: Contract<
  FactorySource["EverscaleSolanaEventConfiguration"]
>;
let proxy: Contract<FactorySource["ProxyTokenTransfer"]>;
let initializer: Account;
let initializerTokenWallet: Contract<FactorySource["TokenWallet"]>;

describe("Test solana everscale event real relay", async function () {
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
    relays = [
      {
        publicKey:
          "16cc3e34e53f6618bd7e054c124542983004c0021bb01c131cabdb2c933b1ece",
        secretKey:
          "16cc3e34e53f6618bd7e054c124542983004c0021bb01c131cabdb2c933b1ece",
      },
    ];

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

    [
      solanaEverscaleEventConfiguration,
      everscaleSolanaEventConfiguration,
      proxy,
      initializer,
    ] = await setupSolanaEverscaleEventConfigurationReal(bridgeOwner, staking);

    initializerTokenWallet = await getTokenWalletByAddress(
      initializer.address,
      await proxy.methods.getTokenRoot({ answerId: 0 }).call()
    );

    metricManager = new MetricManager(
      bridge,
      bridgeOwner,
      staking,
      solanaEverscaleEventConfiguration,
      proxy,
      initializer
    );
  });

  describe("Enable events configuration", async () => {
    it("Add sol event configuration to bridge", async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        solanaEverscaleEventConfiguration
      );
    });

    it("Check sol configuration enabled", async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations["0"]).to.be.not.equal(
        undefined,
        "Configuration not found"
      );

      expect(configurations["0"]._eventConfiguration).to.be.equal(
        solanaEverscaleEventConfiguration.address,
        "Wrong configuration address"
      );

      expect(configurations["0"]._enabled).to.be.equal(
        true,
        "Wrong connector status"
      );
    });
    it("Add ever event configuration to bridge", async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        everscaleSolanaEventConfiguration
      );
    });

    it("Check ever configuration enabled", async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations["1"]).to.be.not.equal(
        undefined,
        "Configuration not found"
      );

      expect(configurations["1"]._eventConfiguration).to.be.equal(
        everscaleSolanaEventConfiguration.address,
        "Wrong configuration address"
      );

      expect(configurations["1"]._enabled).to.be.equal(
        true,
        "Wrong connector status"
      );
    });
    // it('Add stacking event configuration to bridge', async () => {
    //     await enableEventConfiguration(
    //       bridgeOwner,
    //       bridge,
    //       stakingEverscaleSolanaEventConfiguration,
    //     );
    //   });
  });

  let eventVoteData: any;
  let eventDataStructure: any;
  let eventContract: Contract<
    FactorySource["TokenTransferSolanaEverscaleEvent"]
  >;

  describe("Initialize event", async () => {
    it("Setup event data", async () => {
      eventDataStructure = {
        sender_addr: new BigNumber(
          "98776471968569566109529530756793112178692127562903192221493626843708983308791"
        ).toFixed(),
        tokens: 100,
        receiver_addr:
          "0:99f0fb098badc6ff5b974cb56b55e661f4a83dd4170a9b2be97766252e0a70e3",
      };

      const eventData = await cellEncoder.methods
        .encodeSolanaEverscaleEventData(eventDataStructure)
        .call()
        .then((t) => t.data);

      eventVoteData = {
        accountSeed: 111234567,
        slot: 0,
        blockTime: 0,
        txSignature: "",
        eventData,
      };
    });

    it("Initialize event", async () => {
      const tx = await solanaEverscaleEventConfiguration.methods
        .deployEvent({
          eventVoteData,
        })
        .send({
          from: initializer.address,
          amount: locklift.utils.toNano(6),
        });

      logger.log(`Event initialization tx: ${tx.id}`);

      const expectedEventContract =
        await solanaEverscaleEventConfiguration.methods
          .deriveEventAddress(eventVoteData)
          .call();

      logger.log(`Expected event address: ${expectedEventContract}`);

      eventContract = await locklift.factory.getDeployedContract(
        "TokenTransferSolanaEverscaleEvent",
        expectedEventContract.eventContract
      );

      metricManager.addContract(eventContract);
    });

    it("Check event initial state", async () => {
      const details = await eventContract.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._eventInitData.voteData.accountSeed).to.be.equal(
        eventVoteData.accountSeed,
        "Wrong accountSeed"
      );

      expect(details._eventInitData.voteData.eventData).to.be.equal(
        eventVoteData.eventData,
        "Wrong event data"
      );

      expect(details._eventInitData.configuration).to.be.equal(
        solanaEverscaleEventConfiguration.address,
        "Wrong event configuration"
      );

      expect(details._eventInitData.staking).to.be.equal(
        staking.address,
        "Wrong staking"
      );

      expect(details._status).to.be.equal(1, "Wrong status");

      expect(details._confirms).to.have.lengthOf(
        0,
        "Wrong amount of relays confirmations"
      );

      expect(details._rejects).to.have.lengthOf(
        0,
        "Wrong amount of relays rejects"
      );

      expect(details._initializer).to.be.equal(
        initializer.address,
        "Wrong initializer"
      );
    });

    it("Check event required votes", async () => {
      const requiredVotes = await eventContract.methods.requiredVotes().call();

      const relays = await eventContract.methods
        .getVoters({
          vote: 1,
          answerId: 0,
        })
        .call();

      expect(requiredVotes).to.be.greaterThan(
        0,
        "Too low required votes for event"
      );

      expect(relays.voters.length).to.be.greaterThanOrEqual(
        parseInt(requiredVotes.requiredVotes, 10),
        "Too many required votes for event"
      );
    });

    it("Check event round number", async () => {
      const roundNumber = await eventContract.methods.round_number({}).call();

      expect(roundNumber).to.be.equal(0, "Wrong round number");
    });

    it("Check encoded event data", async () => {
      const data = await eventContract.methods
        .getDecodedData({ answerId: 0 })
        .call();

      expect(data.tokens).to.be.equal(
        eventDataStructure.tokens,
        "Wrong amount of tokens"
      );

      expect(data.receiver_addr).to.be.equal(
        eventDataStructure.receiver_addr,
        "Wrong receiver address"
      );
    });
  });
});
