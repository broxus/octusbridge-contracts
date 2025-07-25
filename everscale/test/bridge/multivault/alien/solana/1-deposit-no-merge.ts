import { Contract, zeroAddress } from "locklift";
import {
  AlienTokenWalletUpgradeableAbi,
  BridgeAbi,
  CellEncoderStandaloneAbi,
  EthereumEverscaleEventConfigurationAbi,
  EverscaleEthereumEventConfigurationAbi,
  EverscaleSolanaEventConfigurationAbi,
  MergeRouterAbi,
  MultiVaultSolanaEverscaleEventAlienAbi,
  ProxyMultiVaultAlien_V10Abi,
  SolanaEverscaleEventConfigurationAbi,
  StakingMockupAbi,
  TokenRootAlienSolanaAbi,
} from "../../../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";
import { Ed25519KeyPair } from "nekoton-wasm";
import { setupBridge, setupRelays } from "../../../../utils/bridge";
import { setupAlienMultiVault } from "../../../../utils/multivault/alien";
import { expect } from "chai";
import { deployAccount } from "../../../../utils/account";
import { logContract } from "../../../../utils/logger";
import { EventAction, EventType, processEvent } from "../../../../utils/events";

const logger = require("mocha-logger");

let relays: Ed25519KeyPair[];
let bridge: Contract<BridgeAbi>;
let cellEncoder: Contract<CellEncoderStandaloneAbi>;
let staking: Contract<StakingMockupAbi>;
let bridgeOwner: Account;

let ethereumEverscaleEventConfiguration: Contract<EthereumEverscaleEventConfigurationAbi>;
let everscaleEthereumEventConfiguration: Contract<EverscaleEthereumEventConfigurationAbi>;
let solanaEverscaleEventConfiguration: Contract<SolanaEverscaleEventConfigurationAbi>;
let everscaleSolanaEventConfiguration: Contract<EverscaleSolanaEventConfigurationAbi>;
let initializer: Account;
let proxy: Contract<ProxyMultiVaultAlien_V10Abi>;

let alienTokenRoot: Contract<TokenRootAlienSolanaAbi>;
let mergeRouter: Contract<MergeRouterAbi>;
let initializerAlienTokenWallet: Contract<AlienTokenWalletUpgradeableAbi>;

describe("Deposit Alien token to Everscale with no merging", async function () {
  this.timeout(10000000);

  const alienTokenBase = {
    token: 222,
  };

  const tokenMeta = {
    name: "Giga Chad",
    symbol: "GIGA_CHAD",
    decimals: 6,
  };

  it("Setup bridge", async () => {
    relays = await setupRelays();
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

    const signer = (await locklift.keystore.getSigner("0"))!;

    initializer = await deployAccount(signer, 50);

    await logContract("Initializer", initializer.address);

    [
      ethereumEverscaleEventConfiguration,
      everscaleEthereumEventConfiguration,
      solanaEverscaleEventConfiguration,
      everscaleSolanaEventConfiguration,
      proxy,
    ] = await setupAlienMultiVault(bridgeOwner, staking);
  });

  describe("Transfer alien token from Solana to Everscale", async () => {
    let eventContract: Contract<MultiVaultSolanaEverscaleEventAlienAbi>;

    type EncodeMultiVaultAlienSolanaEverscaleParam = Parameters<
      Contract<CellEncoderStandaloneAbi>["methods"]["encodeMultiVaultAlienSolanaEverscale"]
    >[0];
    let eventDataStructure: EncodeMultiVaultAlienSolanaEverscaleParam;

    type EventVoteDataParam = Parameters<
      Contract<SolanaEverscaleEventConfigurationAbi>["methods"]["deployEvent"]
    >[0]["eventVoteData"];
    let eventVoteData: EventVoteDataParam;

    let eventDataEncoded: string;

    it("Initialize event", async () => {
      eventDataStructure = {
        base_token: alienTokenBase.token,
        ...tokenMeta,

        amount: 333,
        recipient: initializer.address,

        value: 10000,
        expected_evers: 1000,
        payload: "",
      };

      eventDataEncoded = await cellEncoder.methods
        .encodeMultiVaultAlienSolanaEverscale(eventDataStructure)
        .call()
        .then(t => t.value0);

      eventVoteData = {
        accountSeed: 111,
        slot: 0,
        blockTime: 0,
        txSignature: "",
        eventData: eventDataEncoded,
      };

      const tx = await solanaEverscaleEventConfiguration.methods
        .deployEvent({
          eventVoteData,
        })
        .send({
          from: initializer.address,
          amount: locklift.utils.toNano(40),
        });

      logger.log(`Event initialization tx: ${tx.id.hash}`);

      const expectedEventContract = await solanaEverscaleEventConfiguration.methods
        .deriveEventAddress({
          eventVoteData: eventVoteData,
          answerId: 0,
        })
        .call({ responsible: true });

      logger.log(`Expected event: ${expectedEventContract.eventContract}`);

      eventContract = locklift.factory.getDeployedContract(
        "MultiVaultSolanaEverscaleEventAlien",
        expectedEventContract.eventContract,
      );
    });

    it("Check event contract exists", async () => {
      expect(Number(await locklift.provider.getBalance(eventContract.address))).to.be.greaterThan(
        0,
        "Event contract balance is zero",
      );
    });

    it("Check event state before confirmation", async () => {
      const details = await eventContract.methods.getDetails({ answerId: 0 }).call({ responsible: true });

      expect(Number(details._eventInitData.voteData.accountSeed)).to.be.equal(
        eventVoteData.accountSeed,
        "Wrong event data",
      );

      expect(details._eventInitData.voteData.eventData).to.be.equal(eventVoteData.eventData, "Wrong event data");

      expect(details._eventInitData.configuration.toString()).to.be.equal(
        solanaEverscaleEventConfiguration.address.toString(),
        "Wrong event configuration",
      );

      expect(details._eventInitData.staking.toString()).to.be.equal(staking.address.toString(), "Wrong staking");

      expect(details._status).to.be.equal("1", "Wrong status");

      expect(details._confirms).to.have.lengthOf(0, "Wrong amount of relays confirmations");

      expect(details._rejects).to.have.lengthOf(0, "Wrong amount of relays rejects");

      expect(details._initializer.toString()).to.be.equal(initializer.address.toString(), "Wrong initializer");
    });

    it("Check event initialization pipeline passed", async () => {
      const decodedData = await eventContract.methods.getDecodedData({ answerId: 0 }).call({ responsible: true });

      expect(decodedData.proxy_).to.not.be.equal(zeroAddress.toString(), "Event contract failed to fetch the proxy");
      expect(decodedData.token_).to.not.be.equal(zeroAddress.toString(), "Event contract failed to fetch the token");
    });

    it("Fetch alien token", async () => {
      const tokenAddress = await proxy.methods
        .deriveSolanaAlienTokenRoot({
          answerId: 0,
          token: eventDataStructure.base_token,
          name: eventDataStructure.name,
          symbol: eventDataStructure.symbol,
          decimals: eventDataStructure.decimals,
        })
        .call({ responsible: true });

      alienTokenRoot = locklift.factory.getDeployedContract("TokenRootAlienSolana", tokenAddress.value0);

      await logContract("Alien token root", alienTokenRoot.address);
    });

    it("Check alien token root exists", async () => {
      expect(Number(await locklift.provider.getBalance(alienTokenRoot.address))).to.be.greaterThan(
        0,
        "Alien token root balance is zero",
      );
    });

    it("Check alien token root meta", async () => {
      const meta = await alienTokenRoot.methods.meta({ answerId: 0 }).call({ responsible: true });

      expect(meta.base_token).to.be.equal(eventDataStructure.base_token.toString(), "Wrong alien token base token");
      expect(meta.name).to.be.equal(eventDataStructure.name, "Wrong alien token name");
      expect(meta.symbol).to.be.equal(eventDataStructure.symbol, "Wrong alien token symbol");
      expect(meta.decimals).to.be.equal(eventDataStructure.decimals.toString(), "Wrong alien token decimals");

      expect(
        await alienTokenRoot.methods
          .rootOwner({ answerId: 0 })
          .call({ responsible: true })
          .then(t => t.value0.toString()),
      ).to.be.equal(proxy.address.toString(), "Wrong alien token owner");
    });

    it("Fetch merge router", async () => {
      const mergeRouterAddress = await proxy.methods
        .deriveMergeRouter({
          token: alienTokenRoot.address,
          answerId: 0,
        })
        .call({ responsible: true });

      mergeRouter = locklift.factory.getDeployedContract("MergeRouter", mergeRouterAddress.router);

      await logContract("Merge router", mergeRouter.address);
    });

    it("Check merge router exists", async () => {
      expect(Number(await locklift.provider.getBalance(mergeRouter.address))).to.be.greaterThan(
        0,
        "Merge router balance is zero",
      );
    });

    it("Check merge router data", async () => {
      const details = await mergeRouter.methods.getDetails({ answerId: 0 }).call({ responsible: true });

      expect(details._proxy.toString()).to.be.equal(proxy.address.toString(), "Wrong proxy address in merge router");
      expect(details._token.toString()).to.be.equal(
        alienTokenRoot.address.toString(),
        "Wrong token address in merge router",
      );
      expect(details._pool.toString()).to.be.equal(zeroAddress.toString(), "Wrong pool address in merge router");

      expect(
        await mergeRouter.methods
          .owner()
          .call()
          .then(t => t.owner.toString()),
      ).to.be.equal(
        await proxy.methods
          .owner()
          .call()
          .then(t => t.owner.toString()),
        "Wrong router owner",
      );
      expect(
        await mergeRouter.methods
          .manager()
          .call()
          .then(t => t.manager.toString()),
      ).to.be.equal(
        await proxy.methods
          .manager()
          .call()
          .then(t => t.manager.toString()),
        "Wrong router manager",
      );
    });

    it("Check event required votes", async () => {
      const requiredVotes = await eventContract.methods
        .requiredVotes()
        .call()
        .then(t => parseInt(t.requiredVotes, 10));

      const relays = await eventContract.methods
        .getVoters({
          vote: 1,
          answerId: 0,
        })
        .call({ responsible: true });

      expect(requiredVotes).to.be.greaterThan(0, "Too low required votes for event");
      expect(relays.voters.length).to.be.greaterThanOrEqual(requiredVotes, "Too many required votes for event");
    });

    it("Check event round number", async () => {
      const roundNumber = await eventContract.methods.round_number({}).call();

      expect(parseInt(roundNumber.round_number, 10)).to.be.equal(0, "Wrong round number");
    });

    describe("Confirm event", async () => {
      it("Confirm event enough times", async () => {
        await processEvent(relays, eventContract.address, EventType.SolanaEverscale, EventAction.Confirm);

        // // Last confirm
        // const last = relays.pop();
        //
        // locklift.keystore.addKeyPair(last);
        //
        // await locklift.tracing.trace(
        //     eventContract.methods.confirm({
        //         voteReceiver: eventContract.address
        //     }).sendExternal({
        //         publicKey: last.publicKey
        //     })
        // )
      });

      it("Check event confirmed", async () => {
        const details = await eventContract.methods.getDetails({ answerId: 0 }).call({ responsible: true });

        const requiredVotes = await eventContract.methods
          .requiredVotes()
          .call()
          .then(t => parseInt(t.requiredVotes, 10));

        expect(details._status).to.be.equal("2", "Wrong status");

        expect(details._confirms).to.have.lengthOf(requiredVotes, "Wrong amount of relays confirmations");

        expect(details._rejects).to.have.lengthOf(0, "Wrong amount of relays rejects");
      });

      it("Check total supply", async () => {
        const totalSupply = await alienTokenRoot.methods.totalSupply({ answerId: 0 }).call({ responsible: true });

        expect(Number(totalSupply.value0)).to.be.equal(eventDataStructure.amount, "Wrong total supply");
      });

      it("Check initializer token wallet exists", async () => {
        const walletAddress = await alienTokenRoot.methods
          .walletOf({
            walletOwner: initializer.address,
            answerId: 0,
          })
          .call({ responsible: true });

        initializerAlienTokenWallet = locklift.factory.getDeployedContract(
          "AlienTokenWalletUpgradeable",
          walletAddress.value0,
        );

        expect(Number(await locklift.provider.getBalance(initializerAlienTokenWallet.address))).to.be.greaterThan(
          0,
          "Initializer token wallet balance is zero",
        );
      });

      it("Check initializer received tokens", async () => {
        const balance = await initializerAlienTokenWallet.methods.balance({ answerId: 0 }).call({ responsible: true });

        expect(Number(balance.value0)).to.be.equal(eventDataStructure.amount, "Initializer failed to received tokens");
      });
    });
  });
});
