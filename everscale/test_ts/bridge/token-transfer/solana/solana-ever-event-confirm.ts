import { Ed25519KeyPair } from "nekoton-wasm";

const {
  setupBridge,
  setupSolanaEverscaleEventConfiguration,
  setupRelays,
  MetricManager,
  enableEventConfiguration,
  captureConnectors,
  logger,
  getTokenWalletByAddress,
} = require("../../../utils");
import BigNumber from "bignumber.js";

import { expect } from "chai";
import { Contract } from "locklift";
import {
  CellEncoderStandaloneAbi,
  FactorySource,
  SolanaEverscaleEventConfigurationAbi,
} from "../../../../build/factorySource";
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
let proxy: Contract<FactorySource["ProxyTokenTransfer"]>;
let initializer: Account;
let initializerTokenWallet: Contract<FactorySource["TokenWallet"]>;

describe("Test solana everscale event confirm", async function () {
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

    [solanaEverscaleEventConfiguration, proxy, initializer] =
      await setupSolanaEverscaleEventConfiguration(bridgeOwner, staking);

    initializerTokenWallet = await getTokenWalletByAddress(
      initializer.address,
      await proxy.methods
        .getTokenRoot({ answerId: 0 })
        .call()
        .then((t) => t.value0)
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

  describe("Enable event configuration", async () => {
    it("Add event configuration to bridge", async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        solanaEverscaleEventConfiguration.address
      );
    });

    it("Check configuration enabled", async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations["0"]).to.be.not.equal(
        undefined,
        "Configuration not found"
      );

      expect(configurations["0"]._eventConfiguration.toString()).to.be.equal(
        solanaEverscaleEventConfiguration.address.toString(),
        "Wrong configuration address"
      );

      expect(configurations["0"]._enabled).to.be.equal(
        true,
        "Wrong connector status"
      );
    });
  });

  type EncodeSolanaEverscaleEventDataParam = Parameters<
    Contract<CellEncoderStandaloneAbi>["methods"]["encodeSolanaEverscaleEventData"]
  >[0];
  type EventVoteDataParam = Parameters<
    Contract<SolanaEverscaleEventConfigurationAbi>["methods"]["deployEvent"]
  >[0]["eventVoteData"];

  let eventVoteData: EventVoteDataParam;
  let eventDataStructure: EncodeSolanaEverscaleEventDataParam;
  let eventContract: Contract<
    FactorySource["TokenTransferSolanaEverscaleEvent"]
  >;

  describe("Initialize event", async () => {
    it("Setup event data", async () => {
      eventDataStructure = {
        sender_addr: new BigNumber(
          "42383474428106489994084969139012277140818210945614381322072008626484785752705"
        ).toFixed(),
        tokens: 100,
        receiver_addr: initializer.address,
      };

      const eventData = await cellEncoder.methods
        .encodeSolanaEverscaleEventData(eventDataStructure)
        .call()
        .then((t) => t.data);

      eventVoteData = {
        accountSeed: 111,
        slot: 0,
        blockTime: 0,
        txSignature: "",
        eventData,
      };
    });

    it("Initialize event", async () => {
      const tx = await solanaEverscaleEventConfiguration.methods
        .deployEvent({
          eventVoteData: eventVoteData,
        })
        .send({
          from: initializer.address,
          amount: locklift.utils.toNano(6),
        });

      logger.log(`Event initialization tx: ${tx.id}`);

      const expectedEventContract =
        await solanaEverscaleEventConfiguration.methods
          .deriveEventAddress({
            eventVoteData: eventVoteData,
            answerId: 0,
          })
          .call();

      logger.log(
        `Expected event address: ${expectedEventContract.eventContract}`
      );

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
        eventVoteData.accountSeed.toString(),
        "Wrong accountSeed"
      );

      expect(details._eventInitData.voteData.eventData).to.be.equal(
        eventVoteData.eventData,
        "Wrong event data"
      );

      expect(details._eventInitData.configuration.toString()).to.be.equal(
        solanaEverscaleEventConfiguration.address.toString(),
        "Wrong event configuration"
      );

      expect(details._eventInitData.staking.toString()).to.be.equal(
        staking.address.toString(),
        "Wrong staking"
      );

      expect(details._status).to.be.equal("1", "Wrong status");

      expect(details._confirms).to.have.lengthOf(
        0,
        "Wrong amount of relays confirmations"
      );

      expect(details._rejects).to.have.lengthOf(
        0,
        "Wrong amount of relays rejects"
      );

      expect(details._initializer.toString()).to.be.equal(
        initializer.address.toString(),
        "Wrong initializer"
      );
    });

    it("Check event required votes", async () => {
      const requiredVotes = await eventContract.methods
        .requiredVotes()
        .call()
        .then((t) => parseInt(t.requiredVotes, 10));

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
        requiredVotes,
        "Too many required votes for event"
      );
    });

    it("Check event round number", async () => {
      const roundNumber = await eventContract.methods
        .round_number({})
        .call()
        .then((t) => parseInt(t.round_number, 10));

      expect(roundNumber).to.be.equal(0, "Wrong round number");
    });

    it("Check encoded event data", async () => {
      const data = await eventContract.methods
        .getDecodedData({ answerId: 0 })
        .call();

      expect(data.tokens).to.be.equal(
        eventDataStructure.tokens.toString(),
        "Wrong amount of tokens"
      );

      expect(data.receiver_addr.toString()).to.be.equal(
        eventDataStructure.receiver_addr.toString(),
        "Wrong receiver address"
      );
    });
  });

  describe("Confirm event", async () => {
    it("Confirm event enough times", async () => {
      const requiredVotes = await eventContract.methods
        .requiredVotes()
        .call()
        .then((t) => parseInt(t.requiredVotes, 10));

      const confirmations = [];
      for (const [relayId, relay] of Object.entries(
        relays.slice(0, requiredVotes)
      )) {
        logger.log(`Confirm #${relayId} from ${relay.publicKey}`);

        locklift.keystore.addKeyPair(relay);

        confirmations.push(
          eventContract.methods
            .confirm({
              voteReceiver: eventContract.address,
            })
            .sendExternal({
              publicKey: relay.publicKey,
            })
        );
      }
      await Promise.all(confirmations);
    });

    it("Check event confirmed", async () => {
      const details = await eventContract.methods
        .getDetails({ answerId: 0 })
        .call();

      const requiredVotes = await eventContract.methods
        .requiredVotes()
        .call()
        .then((t) => parseInt(t.requiredVotes, 10));

      // expect(details.balance)
      //   .to.be.equal(0, 'Wrong balance');

      expect(details._status).to.be.equal("2", "Wrong status");

      expect(details._confirms).to.have.lengthOf(
        requiredVotes,
        "Wrong amount of relays confirmations"
      );

      expect(details._rejects).to.have.lengthOf(
        0,
        "Wrong amount of relays rejects"
      );
    });

    it("Check event proxy minted tokens", async () => {
      expect(
        await initializerTokenWallet.methods
          .balance({ answerId: 0 })
          .call()
          .then((t) => parseInt(t.value0, 10))
      ).to.be.equal(
        eventDataStructure.tokens,
        "Wrong initializerTokenWallet balance"
      );
    });
  });
});
