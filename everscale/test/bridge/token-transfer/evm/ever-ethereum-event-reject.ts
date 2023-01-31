import { Ed25519KeyPair } from "nekoton-wasm";

import BigNumber from "bignumber.js";
const {
  setupBridge,
  setupEverscaleEthereumEventConfiguration,
  setupRelays,
  MetricManager,
  enableEventConfiguration,
  captureConnectors,
  logger,
  getTokenWalletByAddress,
} = require("../../../utils");

import { expect } from "chai";
import { Contract } from "locklift";
import {
  CellEncoderStandaloneAbi,
  FactorySource,
  TokenWalletAbi,
} from "../../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";

let bridge: Contract<FactorySource["Bridge"]>;
let cellEncoder: Contract<FactorySource["CellEncoderStandalone"]>;
let staking: Contract<FactorySource["StakingMockup"]>;
let bridgeOwner: Account;
let metricManager: InstanceType<typeof MetricManager>;
let relays: Ed25519KeyPair[];
let everscaleEthereumEventConfiguration: Contract<
  FactorySource["EverscaleEthereumEventConfiguration"]
>;
let proxy: Contract<FactorySource["ProxyTokenTransfer"]>;
let initializer: Account;
let initializerTokenWallet: Contract<FactorySource["TokenWallet"]>;

describe("Test everscale ethereum event reject", async function () {
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

    [everscaleEthereumEventConfiguration, proxy, initializer] =
      await setupEverscaleEthereumEventConfiguration(
        bridgeOwner,
        staking,
        cellEncoder
      );

    metricManager = new MetricManager(
      bridge,
      bridgeOwner,
      staking,
      everscaleEthereumEventConfiguration,
      initializer
    );
  });

  describe("Enable event configuration", async () => {
    it("Add event configuration to bridge", async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        everscaleEthereumEventConfiguration.address,
        "ton"
      );
    });

    it("Check configuration enabled", async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations["0"]).to.be.not.equal(
        undefined,
        "Configuration not found"
      );

      expect(configurations["0"]._eventConfiguration.toString()).to.be.equal(
        everscaleEthereumEventConfiguration.address.toString(),
        "Wrong configuration address"
      );

      expect(configurations["0"]._enabled).to.be.equal(
        true,
        "Wrong connector status"
      );
    });
  });

  type EncodeEthereumBurnPayloadParam = Parameters<
    Contract<CellEncoderStandaloneAbi>["methods"]["encodeEthereumBurnPayload"]
  >[0];
  type BurnPayloadParam = Parameters<
    Contract<TokenWalletAbi>["methods"]["burn"]
  >[0]["payload"];

  let everEventParams: EncodeEthereumBurnPayloadParam;
  let everEventValue: number;
  let burnPayload: BurnPayloadParam;
  let eventContract: Contract<
    FactorySource["TokenTransferEverscaleEthereumEvent"]
  >;

  describe("Initialize event", async () => {
    everEventValue = 444;
    everEventParams = {
      ethereumAddress: 222,
      chainId: 333,
    };

    it("Setup event data", async () => {
      initializerTokenWallet = await getTokenWalletByAddress(
        initializer.address,
        await proxy.methods
          .getTokenRoot({ answerId: 0 })
          .call()
          .then((t) => t.value0)
      );

      burnPayload = await cellEncoder.methods
        .encodeEthereumBurnPayload(everEventParams)
        .call()
        .then((t) => t.data);
    });

    it("Initialize event", async () => {
      const tx = await initializerTokenWallet.methods
        .burn({
          amount: everEventValue,
          remainingGasTo: initializer.address,
          callbackTo: proxy.address,
          payload: burnPayload,
        })
        .send({
          from: initializer.address,
          amount: locklift.utils.toNano(4),
        });

      const events = await everscaleEthereumEventConfiguration
        .getPastEvents({ filter: "NewEventContract" })
        .then((e) => e.events);

      expect(events).to.have.lengthOf(
        1,
        "Everscale event configuration didnt deploy event"
      );

      const [
        {
          data: { eventContract: expectedEventContract },
        },
      ] = events;

      logger.log(`Expected event address: ${expectedEventContract}`);

      eventContract = await locklift.factory.getDeployedContract(
        "TokenTransferEverscaleEthereumEvent",
        expectedEventContract
      );
    });

    it("Check event initial state", async () => {
      const details = await eventContract.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._eventInitData.configuration.toString()).to.be.equal(
        everscaleEthereumEventConfiguration.address.toString(),
        "Wrong event configuration"
      );

      expect(details._status).to.be.equal("1", "Wrong status");

      expect(details._confirms).to.have.lengthOf(
        0,
        "Wrong amount of confirmations"
      );

      expect(details._signatures).to.have.lengthOf(
        0,
        "Wrong amount of signatures"
      );

      expect(details._rejects).to.have.lengthOf(0, "Wrong amount of rejects");

      expect(details._initializer.toString()).to.be.equal(
        proxy.address.toString(),
        "Wrong initializer"
      );
    });

    it("Check encoded event data", async () => {
      const data = await eventContract.methods
        .getDecodedData({ answerId: 0 })
        .call();

      expect(data.owner_address.toString()).to.be.equal(
        initializer.address.toString(),
        "Wrong owner address"
      );

      expect(data.wid.toString()).to.be.equal(
        initializer.address.toString().split(":")[0],
        "Wrong wid"
      );

      expect(new BigNumber(data.addr).toString(16)).to.be.equal(
        initializer.address.toString().split(":")[1],
        "Wrong address"
      );

      expect(data.tokens).to.be.equal(
        everEventValue.toString(),
        "Wrong amount of tokens"
      );

      expect(data.ethereum_address.toString()).to.be.equal(
        everEventParams.ethereumAddress.toString(),
        "Wrong ethereum address"
      );

      expect(data.chainId).to.be.equal(
        everEventParams.chainId.toString(),
        "Wrong chain id"
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

      expect(Number(details.balance)).to.be.greaterThan(0, "Wrong balance");

      expect(details._status).to.be.equal("3", "Wrong status");

      expect(details._confirms).to.have.lengthOf(
        0,
        "Wrong amount of relays confirmations"
      );

      expect(details._signatures).to.have.lengthOf(
        0,
        "Wrong amount of signatures"
      );

      expect(details._rejects).to.have.lengthOf(
        requiredVotes,
        "Wrong amount of relays rejects"
      );
    });

    it("Send confirms from the rest of relays", async () => {
      const requiredVotes = await eventContract.methods
        .requiredVotes()
        .call()
        .then((t) => parseInt(t.requiredVotes, 10));

      for (const [relayId, relay] of Object.entries(
        relays.slice(requiredVotes)
      )) {
        logger.log(
          `Reject #${requiredVotes + relayId} from ${relay.publicKey}`
        );

        locklift.keystore.addKeyPair(relay);

        await eventContract.methods
          .reject({
            voteReceiver: eventContract.address,
          })
          .sendExternal({
            publicKey: relay.publicKey,
          });
      }
    });

    it("Check event details after all relays voted", async () => {
      const details = await eventContract.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(Number(details.balance)).to.be.greaterThan(0, "Wrong balance");

      expect(details._status).to.be.equal("3", "Wrong status");

      expect(details._confirms).to.have.lengthOf(
        0,
        "Wrong amount of relays confirmations"
      );

      expect(details._signatures).to.have.lengthOf(
        0,
        "Wrong amount of signatures"
      );

      expect(details._rejects).to.have.lengthOf(
        relays.length,
        "Wrong amount of relays rejects"
      );
    });

    it("Close event", async () => {
      await eventContract.methods.close({}).send({
        from: initializer.address,
        amount: locklift.utils.toNano(1),
      });

      const details = await eventContract.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details.balance).to.be.equal("0", "Wrong balance");
    });
  });
});
