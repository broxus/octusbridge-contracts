import { Ed25519KeyPair } from "nekoton-wasm";

const {
  setupRelays,
  setupBridge,
  setupTokenRootWithWallet,
  setupEthereumNativeMultiVault,
  getTokenWalletByAddress,
  MetricManager,
  logger,
  logContract,
  ...utils
} = require("../../../../utils");

import { expect } from "chai";
import { Contract } from "locklift";
import { FactorySource } from "../../../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";

let bridge: Contract<FactorySource["Bridge"]>;
let cellEncoder: Contract<FactorySource["CellEncoderStandalone"]>;
let staking: Contract<FactorySource["StakingMockup"]>;
let bridgeOwner: Account;
let metricManager: InstanceType<typeof MetricManager>;
let relays: Ed25519KeyPair[];
let evmConfiguration: Contract<
  FactorySource["EthereumEverscaleEventConfiguration"]
>;
let everscaleConfiguration: Contract<
  FactorySource["EverscaleEthereumEventConfiguration"]
>;
let proxy: Contract<FactorySource["ProxyMultiVaultEthereumAlien"]>;
let initializer: Account;

describe("Test EVM native multivault pipeline", async function () {
  this.timeout(10000000);

  let root: Contract<FactorySource["TokenRoot"]>;
  let initializerTokenWallet: Contract<FactorySource["TokenWallet"]>;

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
          )} EVER`
        );
      }
    }
  });

  it("Setup bridge", async () => {
    relays = await setupRelays();
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
    [evmConfiguration, everscaleConfiguration, proxy, initializer] =
      await setupEthereumNativeMultiVault(bridgeOwner, staking);

    root = await setupTokenRootWithWallet(initializer.address, 1000);

    const tokenWalletAddress = await root.methods
      .walletOf({
        walletOwner: initializer.address,
        answerId: 0,
      })
      .call();

    initializerTokenWallet = await locklift.factory.getDeployedContract(
      "TokenWallet",
      tokenWalletAddress.value0
    );

    await logContract(
      "initializerTokenWallet address",
      initializerTokenWallet.address
    );

    metricManager = new utils.MetricManager(
      bridge,
      bridgeOwner,
      staking,
      evmConfiguration,
      everscaleConfiguration,
      proxy,
      initializer,
      root,
      initializerTokenWallet
    );
  });

  describe("Transfer native token from Everscale to EVM", async () => {
    const amount = 500;

    const recipient = 111;
    const chainId = 222;

    let eventContract: Contract<
      FactorySource["MultiVaultEverscaleEVMEventNative"]
    >;

    it("Transfer tokens to the Native Proxy", async () => {
      const payload = await cellEncoder.methods
        .encodeNativeTransferPayloadEthereum({
          recipient,
          chainId,
        })
        .call()
        .then((t) => t.value0);

      const tx = await initializerTokenWallet.methods
        .transfer({
          amount,
          recipient: proxy.address,
          deployWalletValue: locklift.utils.toNano("0.1"),
          remainingGasTo: initializer.address,
          notify: true,
          payload,
        })
        .send({
          from: initializer.address,
          amount: locklift.utils.toNano(10),
        });

      logger.log(`Token transfer tx: ${tx.id}`);

      const events = await everscaleConfiguration
        .getPastEvents({ filter: "NewEventContract" })
        .then((e) => e.events);

      expect(events).to.have.lengthOf(
        1,
        "Everscale event configuration failed to deploy event"
      );

      const [
        {
          data: { eventContract: expectedEventContract },
        },
      ] = events;

      logger.log(`Expected event address: ${expectedEventContract}`);

      eventContract = await locklift.factory.getDeployedContract(
        "MultiVaultEverscaleEVMEventNative",
        expectedEventContract
      );

      metricManager.addContract(eventContract);
    });

    it("Check initializer token balance", async () => {
      const balance = await initializerTokenWallet.methods
        .balance({ answerId: 0 })
        .call();

      expect(balance.value0).to.be.equal(
        500,
        "Wrong initializer token balance"
      );
    });

    it("Check native proxy token balance", async () => {
      const proxyTokenWallet = await getTokenWalletByAddress(
        proxy.address,
        root.address
      );

      const balance = await proxyTokenWallet.methods
        .balance({ answerId: 0 })
        .call();

      expect(balance).to.be.equal(500, "Wrong initializer token balance");
    });

    it("Check event contract exists", async () => {
      expect(
        await locklift.provider.getBalance(eventContract.address)
      ).to.be.greaterThan(0, "Event contract balance is zero");
    });

    it("Check event state before confirmation", async () => {
      const details = await eventContract.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._eventInitData.configuration).to.be.equal(
        everscaleConfiguration.address,
        "Wrong event configuration"
      );

      expect(details._status).to.be.equal(1, "Wrong status");

      expect(details._confirms).to.have.lengthOf(
        0,
        "Wrong amount of confirmations"
      );

      expect(details._signatures).to.have.lengthOf(
        0,
        "Wrong amount of signatures"
      );

      expect(details._rejects).to.have.lengthOf(0, "Wrong amount of rejects");

      expect(details._initializer).to.be.equal(
        proxy.address,
        "Wrong initializer"
      );
    });

    it("Check event data after mutation", async () => {
      const decodedData = await eventContract.methods
        .getDecodedData({ answerId: 0 })
        .call();

      const proxyTokenWallet = await getTokenWalletByAddress(
        proxy.address,
        root.address
      );

      expect(decodedData.proxy_).to.be.equal(
        proxy.address,
        "Wrong event decoded proxy"
      );

      expect(decodedData.tokenWallet_).to.be.equal(
        proxyTokenWallet.address,
        "Wrong event decoded data token wallet"
      );

      expect(decodedData.token_).to.be.equal(
        root.address,
        "Wrong event decoded token root"
      );

      expect(decodedData.remainingGasTo_).to.be.equal(
        initializer.address,
        "Wrong event decoded remaining gas to"
      );

      expect(decodedData.amount_).to.be.equal(
        amount,
        "Wrong event decoded amount"
      );

      expect(decodedData.recipient_).to.be.equal(
        recipient,
        "Wrong event decoded recipient"
      );

      expect(decodedData.chainId_).to.be.equal(
        chainId,
        "Wrong event decoded amount"
      );

      const name = await root.methods.name({ answerId: 0 }).call();
      const symbol = await root.methods.symbol({ answerId: 0 }).call();
      const decimals = await root.methods.decimals({ answerId: 0 }).call();

      expect(decodedData.name_).to.be.equal(
        name,
        "Wrong event decoded root name"
      );
      expect(decodedData.symbol_).to.be.equal(
        symbol,
        "Wrong event decoded root symbol"
      );
      expect(decodedData.decimals_).to.be.equal(
        decimals,
        "Wrong event decoded root decimals"
      );
    });

    it("Check mutated event data", async () => {
      const eventInitData = await eventContract.methods
        .getEventInitData({ answerId: 0 })
        .call();

      const decodedData = await cellEncoder.methods
        .decodeMultiVaultNativeEverscaleEthereum({
          data: eventInitData.value0.voteData.eventData,
        })
        .call();

      expect(decodedData.token_wid).to.be.equal(
        root.address.toString().split(":")[0],
        "Wrong event data token wid"
      );
      expect(decodedData.token_addr).to.be.equal(
        `0x${root.address.toString().split(":")[1]}`,
        "Wrong event data token address"
      );

      expect(decodedData.amount).to.be.equal(amount, "Wrong event data amount");

      expect(decodedData.recipient).to.be.equal(
        recipient,
        "Wrong event data recipient"
      );

      expect(decodedData.chainId).to.be.equal(
        chainId,
        "Wrong event data amount"
      );

      const name = await root.methods.name({ answerId: 0 }).call();
      const symbol = await root.methods.symbol({ answerId: 0 }).call();
      const decimals = await root.methods.decimals({ answerId: 0 }).call();

      expect(decodedData.name).to.be.equal(name, "Wrong event data root name");
      expect(decodedData.symbol).to.be.equal(
        symbol,
        "Wrong event data root symbol"
      );
      expect(decodedData.decimals).to.be.equal(
        decimals,
        "Wrong event data root decimals"
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

    describe("Confirm event", async () => {
      it("Confirm event enough times", async () => {
        const requiredVotes = await eventContract.methods
          .requiredVotes()
          .call();
        const confirmations = [];
        for (const [relayId, relay] of Object.entries(
          relays.slice(0, parseInt(requiredVotes.requiredVotes, 10))
        )) {
          logger.log(`Confirm #${relayId} from ${relay.publicKey}`);

          locklift.keystore.addKeyPair(relay);

          confirmations.push(
            eventContract.methods
              .confirm({
                signature: Buffer.from(`0x${"ff".repeat(65)}`).toString("hex"), // 132 symbols
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
          .call();

        expect(details.balance).to.be.greaterThan(0, "Wrong balance");

        expect(details._status).to.be.equal(2, "Wrong status");

        expect(details._confirms).to.have.lengthOf(
          parseInt(requiredVotes.requiredVotes, 10),
          "Wrong amount of relays confirmations"
        );

        expect(details._signatures).to.have.lengthOf(
          parseInt(requiredVotes.requiredVotes, 10),
          "Wrong amount of signatures"
        );

        expect(details._rejects).to.have.lengthOf(
          0,
          "Wrong amount of relays rejects"
        );
      });

      it("Close event", async () => {
        await eventContract.methods.close({}).send({
          from: initializer.address,
          amount: locklift.utils.toNano(1),
        });
      });
    });
  });

  describe("Transfer native token from EVM to Everscale", async () => {
    let eventDataStructure: any;
    let eventDataEncoded;
    let eventVoteData: any;
    let eventContract: Contract<
      FactorySource["MultiVaultEVMEverscaleEventNative"]
    >;

    const amount = 500;

    it("Initialize event", async () => {
      eventDataStructure = {
        token_wid: root.address.toString().split(":")[0],
        token_addr: `0x${root.address.toString().split(":")[1]}`,
        amount,
        recipient_wid: initializer.address.toString().split(":")[0],
        recipient_addr: `0x${initializer.address.toString().split(":")[1]}`,
      };

      eventDataEncoded = await cellEncoder.methods
        .encodeMultiVaultNativeEVMEverscale(eventDataStructure)
        .call();

      eventVoteData = {
        eventTransaction: 111,
        eventIndex: 222,
        eventData: eventDataEncoded,
        eventBlockNumber: 333,
        eventBlock: 444,
      };

      const tx = await evmConfiguration.methods
        .deployEvent({
          eventVoteData,
        })
        .send({
          from: initializer.address,
          amount: locklift.utils.toNano(6),
        });

      logger.log(`Event initialization tx: ${tx.id}`);

      const expectedEventContract = await evmConfiguration.methods
        .deriveEventAddress(eventVoteData)
        .call();

      logger.log(
        `Expected event address: ${expectedEventContract.eventContract}`
      );

      eventContract = await locklift.factory.getDeployedContract(
        "MultiVaultEVMEverscaleEventNative",
        expectedEventContract.eventContract
      );

      metricManager.addContract(eventContract);
    });

    it("Check event contract exists", async () => {
      expect(
        await locklift.provider.getBalance(eventContract.address)
      ).to.be.greaterThan(0, "Event contract balance is zero");
    });

    it("Check event state before confirmation", async () => {
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
        evmConfiguration.address,
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

    it("Check event decoded data", async () => {
      const decodedData = await eventContract.methods
        .getDecodedData({ answerId: 0 })
        .call();

      expect(decodedData.token_).to.be.equal(
        root.address,
        "Wrong event decoded data token"
      );
      expect(decodedData.amount_).to.be.equal(
        amount,
        "Wrong event decoded data amount"
      );
      expect(decodedData.recipient_).to.be.equal(
        initializer.address,
        "Wrong event decoded data recipient"
      );
      expect(decodedData.proxy_).to.be.equal(
        proxy.address,
        "Wrong event decoded data proxy"
      );

      const proxyTokenWallet = await getTokenWalletByAddress(
        proxy.address,
        root.address
      );

      expect(decodedData.tokenWallet_).to.be.equal(
        proxyTokenWallet.address,
        "Wrong event decoded data token wallet"
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

    describe("Confirm event", async () => {
      it("Confirm event enough times", async () => {
        const requiredVotes = await eventContract.methods
          .requiredVotes()
          .call();
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

        const requiredVotes = await eventContract.methods
          .requiredVotes()
          .call();

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

      it("Check initializer token balance", async () => {
        const balance = await initializerTokenWallet.methods
          .balance({ answerId: 0 })
          .call();

        expect(parseInt(balance.value0, 10)).to.be.equal(
          1000,
          "Wrong initializer token balance"
        );
      });

      it("Check Native Proxy token balance is zero", async () => {
        const proxyTokenWallet = await getTokenWalletByAddress(
          proxy.address,
          root.address
        );

        const balance = await proxyTokenWallet.methods
          .balance({ answerId: 0 })
          .call();

        expect(balance).to.be.equal(0, "Wrong Native Proxy token balance");
      });
    });
  });
});
