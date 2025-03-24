import { setupBridge, setupRelays } from "../../../utils/bridge";
import { deployAccount } from "../../../utils/account";
import { logContract } from "../../../utils/logger";
import { setupAlienMultiVault } from "../../../utils/multivault/alien";
import { Ed25519KeyPair } from "nekoton-wasm";
import { Contract } from "locklift";
import {
  AlienTokenWalletUpgradeableAbi,
  BridgeAbi,
  CellEncoderStandaloneAbi,
  EthereumEverscaleEventConfigurationAbi,
  EverscaleEthereumEventConfigurationAbi,
  EverscaleSolanaEventConfigurationAbi,
  Mediator_V2Abi,
  MergePool_V3Abi,
  MergeRouterAbi,
  MultiVaultEverscaleEVMEventNativeAbi,
  MultiVaultEVMEverscaleEventAlienAbi,
  ProxyMultiVaultAlien_V9Abi,
  ProxyMultiVaultNative_V7Abi,
  SolanaEverscaleEventConfigurationAbi,
  StakingMockupAbi,
  TokenRootAbi,
  TokenRootAlienEVMAbi,
  TrustlessVerifierMockupAbi,
} from "../../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";
import { expect } from "chai";
import { EventAction, EventType, processEvent } from "../../../utils/events";
import { MediatorOperation, setupHiddenBridge } from "../../../utils/hidden-bridge";
import { setupNativeMultiVault } from "../../../utils/multivault/native";

const logger = require("mocha-logger");

let relays: Ed25519KeyPair[];
let bridge: Contract<BridgeAbi>;
let cellEncoder: Contract<CellEncoderStandaloneAbi>;
let staking: Contract<StakingMockupAbi>;
let bridgeOwner: Account;

let mediator: Contract<Mediator_V2Abi>;

let alienEthereumEverscaleEventConfiguration: Contract<EthereumEverscaleEventConfigurationAbi>;
let alienEverscaleEthereumEventConfiguration: Contract<EverscaleEthereumEventConfigurationAbi>;
let alienSolanaEverscaleEventConfiguration: Contract<SolanaEverscaleEventConfigurationAbi>;
let alienEverscaleSolanaEventConfiguration: Contract<EverscaleSolanaEventConfigurationAbi>;
let initializer: Account;
let alienProxy: Contract<ProxyMultiVaultAlien_V9Abi>;

let nativeEthereumEverscaleEventConfiguration: Contract<EthereumEverscaleEventConfigurationAbi>;
let nativeEverscaleEthereumEventConfiguration: Contract<EverscaleEthereumEventConfigurationAbi>;
let nativeSolanaEverscaleEventConfiguration: Contract<SolanaEverscaleEventConfigurationAbi>;
let nativeEverscaleSolanaEventConfiguration: Contract<EverscaleSolanaEventConfigurationAbi>;
let nativeProxy: Contract<ProxyMultiVaultNative_V7Abi>;

let alienTokenRoot: Contract<TokenRootAlienEVMAbi>;
let customTokenRoot: Contract<TokenRootAbi>;
let mergeRouter: Contract<MergeRouterAbi>;
let mergePool: Contract<MergePool_V3Abi>;
let initializerAlienTokenWallet: Contract<AlienTokenWalletUpgradeableAbi>;

let trustlessVerifier: Contract<TrustlessVerifierMockupAbi>;

describe("Test EVM-EVM bridge transfers, deposit alien withdraw native token", async function () {
  this.timeout(10000000);

  const alienTokenBase = {
    chainId: 111,
    token: 222,
  };

  const alienTokenMeta = {
    name: "Giga Chad",
    symbol: "GIGA_CHAD",
    decimals: 6,
  };

  it("Setup bridge", async () => {
    relays = await setupRelays();
    [bridge, bridgeOwner, staking, cellEncoder, trustlessVerifier] = await setupBridge(relays);

    const signer = (await locklift.keystore.getSigner("0"))!;

    initializer = await deployAccount(signer, 50);
    await logContract("Initializer", initializer.address);
  });

  it("Setup alien pipeline", async () => {
    [
      alienEthereumEverscaleEventConfiguration,
      alienEverscaleEthereumEventConfiguration,
      alienSolanaEverscaleEventConfiguration,
      alienEverscaleSolanaEventConfiguration,
      alienProxy,
    ] = await setupAlienMultiVault(bridgeOwner, staking);
  });

  it("Setup native pipeline", async () => {
    [
      nativeEthereumEverscaleEventConfiguration,
      nativeEverscaleEthereumEventConfiguration,
      nativeSolanaEverscaleEventConfiguration,
      nativeEverscaleSolanaEventConfiguration,
      nativeProxy,
    ] = await setupNativeMultiVault(bridgeOwner, staking, trustlessVerifier);
  });

  it("Setup mediator", async () => {
    [mediator] = await setupHiddenBridge(bridgeOwner, nativeProxy, alienProxy);

    await logContract("Mediator", mediator.address);
  });

  describe("Deposit Alien token, withdraw Native (WBNB BNB -> FTM)", async () => {
    let depositEventContract: Contract<MultiVaultEVMEverscaleEventAlienAbi>;
    let withdrawEventContract: Contract<MultiVaultEverscaleEVMEventNativeAbi>;

    type EncodeMultiVaultAlienEVMEverscaleParam = Parameters<
      Contract<CellEncoderStandaloneAbi>["methods"]["encodeMultiVaultAlienEVMEverscale"]
    >[0];
    let eventDataStructure: EncodeMultiVaultAlienEVMEverscaleParam;

    type EventVoteDataParam = Parameters<
      Contract<EthereumEverscaleEventConfigurationAbi>["methods"]["deployEvent"]
    >[0]["eventVoteData"];
    let eventVoteData: EventVoteDataParam;

    let eventDataEncoded: string;

    const callback = {
      recipient: 123,
      strict: false,
      payload: "",
    };

    let payload: string;

    it("Build withdrawal payload", async () => {
      const nativeWithdrawalPayload = await cellEncoder.methods
        .encodeNativeTransferPayloadEthereum({
          recipient: 123,
          chainId: 1,
          callback,
        })
        .call()
        .then(t => t.value0);

      payload = await cellEncoder.methods
        .encodeMediatorPayload({
          operation: MediatorOperation.TransferToNativeProxy,
          proxy: nativeProxy.address,
          payload: nativeWithdrawalPayload,
        })
        .call()
        .then(t => t.value0);
    });

    it("Deploy", async () => {
      eventDataStructure = {
        base_chainId: alienTokenBase.chainId,
        base_token: alienTokenBase.token,
        ...alienTokenMeta,

        amount: 333,
        recipient_wid: mediator.address.toString().split(":")[0],
        recipient_addr: `0x${mediator.address.toString().split(":")[1]}`,

        value: 10000,
        expected_evers: 1000,
        payload,
      };

      eventDataEncoded = await cellEncoder.methods
        .encodeMultiVaultAlienEVMEverscale(eventDataStructure)
        .call()
        .then(t => t.value0);

      eventVoteData = {
        eventTransaction: 111,
        eventIndex: 222,
        eventData: eventDataEncoded,
        eventBlockNumber: 333,
        eventBlock: 444,
      };

      const tx = await alienEthereumEverscaleEventConfiguration.methods
        .deployEvent({
          eventVoteData,
        })
        .send({
          from: initializer.address,
          amount: locklift.utils.toNano(30),
        });

      logger.log(`Event initialization tx: ${tx.id.hash}`);

      const expectedEventContract = await alienEthereumEverscaleEventConfiguration.methods
        .deriveEventAddress({
          eventVoteData: eventVoteData,
          answerId: 0,
        })
        .call({ responsible: true });

      logger.log(`Expected event: ${expectedEventContract.eventContract}`);

      depositEventContract = locklift.factory.getDeployedContract(
        "MultiVaultEVMEverscaleEventAlien",
        expectedEventContract.eventContract,
      );
    });

    it("Confirm event", async () => {
      await processEvent(relays, depositEventContract.address, EventType.EthereumEverscale, EventAction.Confirm);
    });

    it("Check withdraw event contract deployed", async () => {
      const events = await nativeEverscaleEthereumEventConfiguration
        .getPastEvents({ filter: "NewEventContract" })
        .then(e => e.events);

      expect(events).to.have.lengthOf(1, "Everscale event configuration failed to deploy event");

      const [
        {
          data: { eventContract: expectedEventContract },
        },
      ] = events;

      logger.log(`Expected event address: ${expectedEventContract}`);

      withdrawEventContract = locklift.factory.getDeployedContract(
        "MultiVaultEverscaleEVMEventNative",
        expectedEventContract,
      );
    });

    it("Check event contract nonce", async () => {
      const { nonce: depositNonce } = await depositEventContract.methods.nonce({}).call();

      const { nonce: withdrawNonce } = await withdrawEventContract.methods.nonce({}).call();

      expect(depositNonce).to.be.equal(withdrawNonce, "Wrong deposit and withdraw nonces");
    });

    it("Check withdraw event sender", async () => {
      const { sender } = await withdrawEventContract.methods.sender({}).call();

      expect(sender.toString()).to.be.equal(mediator.address.toString(), "Withdraw sender should be mediator");
    });
  });
});
