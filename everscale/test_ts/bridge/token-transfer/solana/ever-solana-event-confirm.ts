import { Ed25519KeyPair } from "nekoton-wasm";
const BigNumber = require("js");
const {
  setupBridge,
  setupEverscaleSolanaEventConfiguration,
  setupRelays,
  MetricManager,
  enableEventConfiguration,
  captureConnectors,
  logger,
  getTokenWalletByAddress,
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
let everscaleSolanaEventConfiguration: Contract<
  FactorySource["EverscaleSolanaEventConfiguration"]
>;
let proxy: Contract<FactorySource["ProxyTokenTransfer"]>;
let initializer: Account;
let initializerTokenWallet: Contract<FactorySource["TokenWallet"]>;

describe("Test everscale solana event confirm", async function () {
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

    [everscaleSolanaEventConfiguration, proxy, initializer] =
      await setupEverscaleSolanaEventConfiguration(bridgeOwner, staking);

    metricManager = new MetricManager(
      bridge,
      bridgeOwner,
      staking,
      everscaleSolanaEventConfiguration,
      initializer
    );
  });

  describe("Enable event configuration", async () => {
    it("Add event configuration to bridge", async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        everscaleSolanaEventConfiguration,
        "ton"
      );
    });

    it("Check configuration enabled", async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations["0"]).to.be.not.equal(
        undefined,
        "Configuration not found"
      );

      expect(configurations["0"]._eventConfiguration).to.be.equal(
        everscaleSolanaEventConfiguration.address,
        "Wrong configuration address"
      );

      expect(configurations["0"]._enabled).to.be.equal(
        true,
        "Wrong connector status"
      );
    });
  });

  let everEventParams: any;
  let everEventValue: any;
  let burnPayload: any;
  let eventContract: Contract<
    FactorySource["TokenTransferEverscaleSolanaEvent"]
  >;

  describe("Initialize event", async () => {
    everEventValue = 100;

    everEventParams = {
      solanaOwnerAddress: new BigNumber(
        "42383474428106489994084969139012277140818210945614381322072008626484785752705"
      ).toFixed(),
      executeAccounts: [
        {
          account: new BigNumber(
            "42383474428106489994084969139012277140818210945614381322072008626484785752705"
          ).toFixed(),
          readOnly: true,
          isSigner: true,
        },
        {
          account: new BigNumber(
            "42383474428106489994084969139012277140818210945614381322072008626484785752705"
          ).toFixed(),
          readOnly: false,
          isSigner: false,
        },
        {
          account: new BigNumber(
            "42383474428106489994084969139012277140818210945614381322072008626484785752705"
          ).toFixed(),
          readOnly: false,
          isSigner: false,
        },
        {
          account: new BigNumber(
            "42383474428106489994084969139012277140818210945614381322072008626484785752705"
          ).toFixed(),
          readOnly: false,
          isSigner: false,
        },
        {
          account: new BigNumber(
            "42383474428106489994084969139012277140818210945614381322072008626484785752705"
          ).toFixed(),
          readOnly: false,
          isSigner: false,
        },
        {
          account: new BigNumber(
            "42383474428106489994084969139012277140818210945614381322072008626484785752705"
          ).toFixed(),
          readOnly: false,
          isSigner: false,
        },
      ],
    };

    it("Setup event data", async () => {
      initializerTokenWallet = await getTokenWalletByAddress(
        initializer.address,
        await proxy.methods.getTokenRoot({ answerId: 0 }).call()
      );

      burnPayload = await cellEncoder.methods
        .encodeSolanaBurnPayload(everEventParams)
        .call()
        .then((t) => t.data);
    });

    it("Initialize event", async () => {
      await initializerTokenWallet.methods
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

      const events = await everscaleSolanaEventConfiguration
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
        "TokenTransferEverscaleSolanaEvent",
        expectedEventContract
      );

      metricManager.addContract(eventContract);
    });

    it("Check event initial state", async () => {
      const details = await eventContract.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._eventInitData.configuration).to.be.equal(
        everscaleSolanaEventConfiguration.address,
        "Wrong event configuration"
      );

      expect(details._status).to.be.equal(1, "Wrong status");

      expect(details._confirms).to.have.lengthOf(
        0,
        "Wrong amount of confirmations"
      );

      expect(details._rejects).to.have.lengthOf(0, "Wrong amount of rejects");

      expect(details._initializer).to.be.equal(
        proxy.address,
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

    it("Check encoded event data", async () => {
      const data = await eventContract.methods
        .getDecodedData({ answerId: 0 })
        .call();

      expect(data.senderAddress).to.be.equal(
        initializer.address,
        "Wrong owner address"
      );

      expect(data.tokens).to.be.equal(everEventValue, "Wrong amount of tokens");

      expect(data.solanaOwnerAddress).to.be.equal(
        everEventParams.solanaOwnerAddress,
        "Wrong solana owner address"
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

      expect(details.balance).to.be.equal(0, "Wrong balance");

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

    // it('Send confirms from the rest of relays', async () => {
    //   const requiredVotes = await eventContract.call({
    //     method: 'requiredVotes',
    //   });
    //
    //   for (const [relayId, relay] of Object.entries(relays.slice(requiredVotes))) {
    //     logger.log(`Confirm #${requiredVotes.plus(relayId)} from ${relay.public}`);
    //
    //     await eventContract.run({
    //       method: 'confirm',
    //       params: {
    //         voteReceiver: eventContract.address
    //       },
    //       keyPair: relay
    //     });
    //   }
    // });

    // it('Check event details after all relays voted', async () => {
    //   const details = await eventContract.call({
    //     method: 'getDetails'
    //   });
    //
    //   expect(details.balance)
    //     .to.be.greaterThan(0, 'Wrong balance');
    //
    //   expect(details._status)
    //     .to.be.equal(2, 'Wrong status');
    //
    //   expect(details._confirms)
    //     .to.have.lengthOf(relays.length, 'Wrong amount of relays confirmations');
    //
    //   expect(details._rejects)
    //     .to.have.lengthOf(0, 'Wrong amount of relays rejects');
    // });

    // it('Close event', async () => {
    //   await initializer.runTarget({
    //     contract: eventContract,
    //     method: 'close',
    //     params: {},
    //     value: locklift.utils.convertCrystal(1, 'nano')
    //   });
    //
    //   const details = await eventContract.call({
    //     method: 'getDetails'
    //   });
    //
    //   expect(details.balance)
    //     .to.be.equal(0, 'Wrong balance');
    // });
  });
});
