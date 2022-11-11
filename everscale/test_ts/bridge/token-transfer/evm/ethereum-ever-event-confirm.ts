import { Ed25519KeyPair } from "nekoton-wasm";

const {
  setupBridge,
  setupEthereumEverscaleEventConfiguration,
  setupRelays,
  MetricManager,
  enableEventConfiguration,
  captureConnectors,
  logger,
  getTokenWalletByAddress,
  getTokenRoot,
} = require("../../../utils");

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
let ethereumEverscaleEventConfiguration: Contract<
  FactorySource["EthereumEverscaleEventConfiguration"]
>;
let proxy: Contract<FactorySource["ProxyTokenTransfer"]>;
let initializer: Account;
let initializerTokenWallet: Contract<FactorySource["TokenWallet"]>;

describe("Test ethereum everscale event confirm", async function () {
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

    initializerTokenWallet = await getTokenWalletByAddress(
      initializer.address,
      await proxy.methods.getTokenRoot({ answerId: 0 }).call()
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
        ethereumEverscaleEventConfiguration
      );
    });

    it("Check configuration enabled", async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations["0"]).to.be.not.equal(
        undefined,
        "Configuration not found"
      );

      expect(configurations["0"]._eventConfiguration).to.be.equal(
        ethereumEverscaleEventConfiguration.address,
        "Wrong configuration address"
      );

      expect(configurations["0"]._enabled).to.be.equal(
        true,
        "Wrong connector status"
      );
    });
  });

  let eventVoteData: any;
  let eventDataStructure: any;
  let eventContract: Contract<
    FactorySource["TokenTransferEthereumEverscaleEvent"]
  >;

  describe("Initialize event", async () => {
    eventDataStructure = {
      tokens: 100,
      wid: 0,
      owner_addr: 0,
    };

    it("Setup event data", async () => {
      eventDataStructure.owner_addr = initializer.address
        .toString()
        .replace("0:", "0x");

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
          .deriveEventAddress(eventVoteData)
          .call();

      logger.log(
        `Expected event address: ${expectedEventContract.eventContract}`
      );

      eventContract = await locklift.factory.getDeployedContract(
        "TokenTransferEthereumEverscaleEvent",
        expectedEventContract.eventContract
      );

      metricManager.addContract(eventContract);
    });

    it("Check event initial state", async () => {
      const details = await eventContract.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._eventInitData.voteData.eventTransaction).to.be.equal(
        eventVoteData.eventTransaction,
        "Wrong event transaction"
      );

      expect(details._eventInitData.voteData.eventIndex).to.be.equal(
        eventVoteData.eventIndex,
        "Wrong event index"
      );

      expect(details._eventInitData.voteData.eventData).to.be.equal(
        eventVoteData.eventData,
        "Wrong event data"
      );

      expect(details._eventInitData.voteData.eventBlockNumber).to.be.equal(
        eventVoteData.eventBlockNumber,
        "Wrong event block number"
      );

      expect(details._eventInitData.voteData.eventBlock).to.be.equal(
        eventVoteData.eventBlock,
        "Wrong event block"
      );

      expect(details._eventInitData.configuration).to.be.equal(
        ethereumEverscaleEventConfiguration.address,
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

      expect(data.wid).to.be.equal(eventDataStructure.wid, "Wrong wid");

      expect(data.owner_addr).to.be.equal(
        eventDataStructure.owner_addr,
        "Wrong owner address"
      );
    });
  });

  describe("Confirm event", async () => {
    it("Confirm event enough times", async () => {
      const requiredVotes = await eventContract.methods.requiredVotes().call();

      const confirmations = [];
      for (const [relayId, relay] of Object.entries(
        relays.slice(0, parseInt(requiredVotes.requiredVotes, 10))
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

      const requiredVotes = await eventContract.methods.requiredVotes().call();

      expect(details._status).to.be.equal(2, "Wrong status");

      expect(details._confirms).to.have.lengthOf(
        parseInt(requiredVotes.requiredVotes, 10),
        "Wrong amount of relays confirmations"
      );

      expect(details._rejects).to.have.lengthOf(
        0,
        "Wrong amount of relays rejects"
      );
    });

    it("Check event proxy minted tokens", async () => {
      expect(
        await initializerTokenWallet.methods.balance({ answerId: 0 }).call()
      ).to.be.equal(
        eventDataStructure.tokens,
        "Wrong initializerTokenWallet balance"
      );
    });
  });

  describe("Test Proxy", async () => {
    it("Test Proxy token transfer ownership", async () => {
      const token: Contract<FactorySource["TokenRoot"]> = await getTokenRoot(
        proxy.methods.getTokenRoot({ answerId: 0 }).call()
      );

      expect(await token.methods.rootOwner({ answerId: 0 }).call()).to.be.equal(
        proxy.address,
        "Wrong initial token owner"
      );

      await proxy.methods
        .transferTokenOwnership({
          target: token.address,
          newOwner: bridgeOwner.address,
        })
        .send({
          from: token.address,
          amount: locklift.utils.toNano(1),
        });

      expect(await token.methods.rootOwner({ answerId: 0 }).call()).to.be.equal(
        bridgeOwner.address,
        "Wrong token owner after transfer"
      );
    });
  });
});
