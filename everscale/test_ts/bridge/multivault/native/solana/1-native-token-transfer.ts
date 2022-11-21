import { Ed25519KeyPair } from "nekoton-wasm";

const {
  setupRelays,
  setupBridge,
  setupTokenRootWithWallet,
  setupSolanaNativeMultiVault,
  getTokenWalletByAddress,
  MetricManager,
  logger,
  logContract,
} = require("../../../../utils");

import { expect } from "chai";
import { Contract } from "locklift";
import {
  CellEncoderStandaloneAbi,
  EthereumEverscaleEventConfigurationAbi,
  FactorySource,
  SolanaEverscaleEventConfigurationAbi,
} from "../../../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";
import BigNumber from "bignumber.js";

let bridge: Contract<FactorySource["Bridge"]>;
let cellEncoder: Contract<FactorySource["CellEncoderStandalone"]>;
let staking: Contract<FactorySource["StakingMockup"]>;
let bridgeOwner: Account;
let metricManager: InstanceType<typeof MetricManager>;
let relays: Ed25519KeyPair[];
let solanaConfiguration: Contract<
  FactorySource["SolanaEverscaleEventConfiguration"]
>;
let everscaleConfiguration: Contract<
  FactorySource["EverscaleSolanaEventConfiguration"]
>;
let proxy: Contract<FactorySource["ProxyMultiVaultEthereumAlien"]>;
let initializer: Account;

describe("Test Solana native multivault pipeline", async function () {
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
    [solanaConfiguration, everscaleConfiguration, proxy, initializer] =
      await setupSolanaNativeMultiVault(bridgeOwner, staking);

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

    metricManager = new MetricManager(
      bridge,
      bridgeOwner,
      staking,
      solanaConfiguration,
      everscaleConfiguration,
      proxy,
      initializer,
      root,
      initializerTokenWallet
    );
  });

  describe("Transfer native token from Everscale to Solana", async () => {
    const amount = 500;

    const recipient = 111;

    let eventContract: Contract<
      FactorySource["MultiVaultEverscaleSolanaEventNative"]
    >;

    it("Transfer tokens to the Native Proxy", async () => {
      const payload = await cellEncoder.methods
        .encodeNativeTransferPayloadSolana({
          recipient,
          executeAccounts: [],
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

      logger.log(`Token transfer tx: ${tx.id.hash}`);

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
        "MultiVaultEverscaleSolanaEventNative",
        expectedEventContract
      );

      metricManager.addContract(eventContract);
    });

    it("Check initializer token balance", async () => {
      const balance = await initializerTokenWallet.methods
        .balance({ answerId: 0 })
        .call();

      expect(balance.value0).to.be.equal(
        "500",
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

      expect(balance.value0).to.be.equal(
        "500",
        "Wrong initializer token balance"
      );
    });

    it("Check event contract exists", async () => {
      expect(
        Number(await locklift.provider.getBalance(eventContract.address))
      ).to.be.greaterThan(0, "Event contract balance is zero");
    });

    it("Check event state before confirmation", async () => {
      const details = await eventContract.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._eventInitData.configuration.toString()).to.be.equal(
        everscaleConfiguration.address.toString(),
        "Wrong event configuration"
      );

      expect(details._status).to.be.equal("1", "Wrong status");

      expect(details._confirms).to.have.lengthOf(
        0,
        "Wrong amount of confirmations"
      );

      expect(details._rejects).to.have.lengthOf(0, "Wrong amount of rejects");

      expect(details._initializer.toString()).to.be.equal(
        proxy.address.toString(),
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

      expect(decodedData.proxy_.toString()).to.be.equal(
        proxy.address.toString(),
        "Wrong event decoded proxy"
      );

      expect(decodedData.tokenWallet_.toString()).to.be.equal(
        proxyTokenWallet.address.toString(),
        "Wrong event decoded data token wallet"
      );

      expect(decodedData.token_.toString()).to.be.equal(
        root.address.toString(),
        "Wrong event decoded token root"
      );

      expect(decodedData.remainingGasTo_.toString()).to.be.equal(
        initializer.address.toString(),
        "Wrong event decoded remaining gas to"
      );

      expect(decodedData.amount_.toString()).to.be.equal(
        amount.toString(),
        "Wrong event decoded amount"
      );

      expect(decodedData.recipient_.toString()).to.be.equal(
        recipient.toString(),
        "Wrong event decoded recipient"
      );

      const name = await root.methods
        .name({ answerId: 0 })
        .call()
        .then((t) => t.value0);
      const symbol = await root.methods
        .symbol({ answerId: 0 })
        .call()
        .then((t) => t.value0);
      const decimals = await root.methods
        .decimals({ answerId: 0 })
        .call()
        .then((t) => t.value0);

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
        .decodeMultiVaultNativeEverscaleSolana({
          data: eventInitData.value0.voteData.eventData,
        })
        .call();

      expect(decodedData.token.toString()).to.be.equal(
        root.address.toString(),
        "Wrong event data token"
      );

      expect(decodedData.amount).to.be.equal(
        amount.toString(),
        "Wrong event data amount"
      );

      expect(decodedData.recipient).to.be.equal(
        recipient.toString(),
        "Wrong event data recipient"
      );

      const name = await root.methods
        .name({ answerId: 0 })
        .call()
        .then((t) => t.value0);
      const symbol = await root.methods
        .symbol({ answerId: 0 })
        .call()
        .then((t) => t.value0);
      const decimals = await root.methods
        .decimals({ answerId: 0 })
        .call()
        .then((t) => t.value0);

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

        expect(Number(details.balance)).to.be.greaterThan(0, "Wrong balance");

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

      it("Close event", async () => {
        await eventContract.methods.close({}).send({
          from: initializer.address,
          amount: locklift.utils.toNano(1),
        });
      });
    });
  });

  describe("Transfer native token from Solana to Everscale", async () => {
    type EncodeMultiVaultNativeSolanaEverscaleParam = Parameters<
      Contract<CellEncoderStandaloneAbi>["methods"]["encodeMultiVaultNativeSolanaEverscale"]
    >[0];
    type EventVoteDataParam = Parameters<
      Contract<SolanaEverscaleEventConfigurationAbi>["methods"]["deployEvent"]
    >[0]["eventVoteData"];

    let eventVoteData: EventVoteDataParam;
    let eventDataStructure: EncodeMultiVaultNativeSolanaEverscaleParam;
    let eventDataEncoded;
    let eventContract: Contract<
      FactorySource["MultiVaultSolanaEverscaleEventNative"]
    >;

    const amount = 500;

    it("Initialize event", async () => {
      eventDataStructure = {
        token: root.address,
        amount,
        recipient: initializer.address,
        payload: "",
        sol_amount: 0,
      };

      eventDataEncoded = await cellEncoder.methods
        .encodeMultiVaultNativeSolanaEverscale(eventDataStructure)
        .call()
        .then((t) => t.value0);

      eventVoteData = {
        accountSeed: 111,
        slot: 0,
        blockTime: 0,
        txSignature: "",
        eventData: eventDataEncoded,
      };

      const tx = await solanaConfiguration.methods
        .deployEvent({
          eventVoteData,
        })
        .send({
          from: initializer.address,
          amount: locklift.utils.toNano(6),
        });

      logger.log(`Event initialization tx: ${tx.id}`);

      const expectedEventContract = await solanaConfiguration.methods
        .deriveEventAddress({
          eventVoteData: eventVoteData,
          answerId: 0,
        })
        .call();

      logger.log(
        `Expected event address: ${expectedEventContract.eventContract}`
      );

      eventContract = await locklift.factory.getDeployedContract(
        "MultiVaultSolanaEverscaleEventNative",
        expectedEventContract.eventContract
      );

      metricManager.addContract(eventContract);
    });

    it("Check event contract exists", async () => {
      expect(
        Number(await locklift.provider.getBalance(eventContract.address))
      ).to.be.greaterThan(0, "Event contract balance is zero");
    });

    it("Check event state before confirmation", async () => {
      const details = await eventContract.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._eventInitData.voteData.accountSeed).to.be.equal(
        eventVoteData.accountSeed.toString(),
        "Wrong account seed"
      );

      expect(details._eventInitData.voteData.eventData).to.be.equal(
        eventVoteData.eventData,
        "Wrong event data"
      );

      expect(details._eventInitData.configuration.toString()).to.be.equal(
        solanaConfiguration.address.toString(),
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

    it("Check event decoded data", async () => {
      const decodedData = await eventContract.methods
        .getDecodedData({ answerId: 0 })
        .call();

      expect(decodedData.token_.toString()).to.be.equal(
        root.address.toString(),
        "Wrong event decoded data token"
      );
      expect(decodedData.amount_).to.be.equal(
        amount.toString(),
        "Wrong event decoded data amount"
      );
      expect(decodedData.recipient_.toString()).to.be.equal(
        initializer.address.toString(),
        "Wrong event decoded data recipient"
      );
      expect(decodedData.proxy_.toString()).to.be.equal(
        proxy.address.toString(),
        "Wrong event decoded data proxy"
      );

      const proxyTokenWallet = await getTokenWalletByAddress(
        proxy.address,
        root.address
      );

      expect(decodedData.tokenWallet_.toString()).to.be.equal(
        proxyTokenWallet.address.toString(),
        "Wrong event decoded data token wallet"
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
      const roundNumber = await eventContract.methods.round_number({}).call();

      expect(roundNumber.round_number).to.be.equal("0", "Wrong round number");
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

      it("Check initializer token balance", async () => {
        const balance = await initializerTokenWallet.methods
          .balance({ answerId: 0 })
          .call();

        expect(balance.value0).to.be.equal(
          "1000",
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
          .call()
          .then((t: any) => t.value0);

        expect(balance).to.be.equal("0", "Wrong Native Proxy token balance");
      });
    });
  });
});
