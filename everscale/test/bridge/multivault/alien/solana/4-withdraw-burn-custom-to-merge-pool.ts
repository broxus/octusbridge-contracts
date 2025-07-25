import { Ed25519KeyPair } from "nekoton-wasm";
import { Contract } from "locklift";
import {
  BridgeAbi,
  CellEncoderStandaloneAbi,
  EthereumEverscaleEventConfigurationAbi,
  EverscaleEthereumEventConfigurationAbi,
  EverscaleSolanaEventConfigurationAbi,
  MergePool_V3Abi,
  MergeRouterAbi,
  MultiVaultEverscaleSolanaEventAlienAbi,
  ProxyMultiVaultAlien_V10Abi,
  SolanaEverscaleEventConfigurationAbi,
  StakingMockupAbi,
  TokenRootAbi,
  TokenRootAlienSolanaAbi,
  TokenWalletAbi,
} from "../../../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";
import { setupBridge, setupRelays } from "../../../../utils/bridge";
import { deployAccount } from "../../../../utils/account";
import { logContract } from "../../../../utils/logger";
import { setupAlienMultiVault } from "../../../../utils/multivault/alien";
import { deployTokenRoot } from "../../../../utils/token";
import { expect } from "chai";
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
let customTokenRoot: Contract<TokenRootAbi>;
let initializerCustomTokenWallet: Contract<TokenWalletAbi>;
let mergeRouter: Contract<MergeRouterAbi>;
let mergePool: Contract<MergePool_V3Abi>;
let eventContract: Contract<MultiVaultEverscaleSolanaEventAlienAbi>;

describe("Withdraw custom tokens by burning in favor of merge pool", async function () {
  this.timeout(10000000);

  const alienTokenBase = {
    token: 222,
  };

  const alienTokenMeta = {
    name: "Giga Chad",
    symbol: "GIGA_CHAD",
    decimals: 6,
  };

  const customTokenMeta = {
    name: "Custom Giga Chad",
    symbol: "CUSTOM_GIGA_CHAD",
    decimals: 9,
  };

  const mintAmount = 100000;
  const amount = 33300;

  const executeAccounts = [
    {
      account: 123,
      readOnly: false,
      isSigner: true,
    },
  ];

  const recipient = 888;

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

  it("Deploy custom token root", async () => {
    customTokenRoot = await deployTokenRoot(
      customTokenMeta.name,
      customTokenMeta.symbol,
      customTokenMeta.decimals,
      bridgeOwner.address,
    );

    await logContract("Custom token root", customTokenRoot.address);
  });

  it("Mint custom tokens to initializer", async () => {
    await customTokenRoot.methods
      .mint({
        amount: mintAmount,
        recipient: initializer.address,
        payload: "",
        deployWalletValue: locklift.utils.toNano(1),
        remainingGasTo: bridgeOwner.address,
        notify: false,
      })
      .send({
        from: bridgeOwner.address,
        amount: locklift.utils.toNano(2),
      });
  });

  it("Transfer custom token ownership to proxy", async () => {
    await customTokenRoot.methods
      .transferOwnership({
        newOwner: proxy.address,
        remainingGasTo: bridgeOwner.address,
        callbacks: [],
      })
      .send({
        from: bridgeOwner.address,
        amount: locklift.utils.toNano(2),
      });
  });

  it("Check initializer custom token balance", async () => {
    const walletAddress = await customTokenRoot.methods
      .walletOf({
        answerId: 0,
        walletOwner: initializer.address,
      })
      .call({ responsible: true });

    initializerCustomTokenWallet = locklift.factory.getDeployedContract("TokenWallet", walletAddress.value0);

    const balance = await initializerCustomTokenWallet.methods.balance({ answerId: 0 }).call({ responsible: true });

    expect(Number(balance.value0)).to.be.equal(mintAmount, "Wrong initializer token balance after mint");
  });

  it("Deploy alien token root", async () => {
    await proxy.methods
      .deploySolanaAlienToken({
        ...alienTokenBase,
        ...alienTokenMeta,
        remainingGasTo: initializer.address,
      })
      .send({
        from: initializer.address,
        amount: locklift.utils.toNano(15),
      });

    const alienTokenRootAddress = await proxy.methods
      .deriveSolanaAlienTokenRoot({
        ...alienTokenBase,
        ...alienTokenMeta,
        answerId: 0,
      })
      .call({ responsible: true });

    alienTokenRoot = locklift.factory.getDeployedContract("TokenRootAlienSolana", alienTokenRootAddress.value0);

    await logContract("Alien token root", alienTokenRoot.address);
  });

  it("Deploy merge router", async () => {
    await proxy.methods
      .deployMergeRouter({
        token: alienTokenRoot.address,
      })
      .send({
        from: initializer.address,
        amount: locklift.utils.toNano(5),
      });

    const mergeRouterAddress = await proxy.methods
      .deriveMergeRouter({
        answerId: 0,
        token: alienTokenRoot.address,
      })
      .call({ responsible: true });

    mergeRouter = locklift.factory.getDeployedContract("MergeRouter", mergeRouterAddress.router);

    await logContract("Merge router", mergeRouter.address);
  });

  it("Deploy merge pool", async () => {
    const nonce = locklift.utils.getRandomNonce();

    await proxy.methods
      .deployMergePool({
        nonce,
        tokens: [alienTokenRoot.address, customTokenRoot.address],
        canonId: 1,
      })
      .send({
        from: initializer.address,
        amount: locklift.utils.toNano(5),
      });

    const mergePoolAddress = await proxy.methods
      .deriveMergePool({
        nonce,
        answerId: 0,
      })
      .call({ responsible: true });

    mergePool = locklift.factory.getDeployedContract("MergePool_V3", mergePoolAddress.pool);

    await logContract("MergePool", mergePool.address);
  });

  it("Enable merge pool tokens", async () => {
    await mergePool.methods.enableAll().send({
      from: bridgeOwner.address,
      amount: locklift.utils.toNano(1),
    });

    const tokens = await mergePool.methods.getTokens({ answerId: 0 }).call({ responsible: true });

    expect(tokens._tokens[0][1].enabled).to.be.equal(true, "Wrong alien status");
    expect(tokens._tokens[1][1].enabled).to.be.equal(true, "Wrong canon status");

    expect(tokens._canon.toString()).to.be.equal(customTokenRoot.address.toString(), "Wrong canon token");
  });

  it("Burn tokens in favor of proxy", async () => {
    const burnPayload = await cellEncoder.methods
      .encodeMergePoolBurnWithdrawPayloadSolana({
        targetToken: alienTokenRoot.address,
        recipient,
        executeAccounts,
        executePayloadNeeded: false,
        executePayloadAccounts: executeAccounts,
        payload: "",
      })
      .call();

    const tx = await locklift.tracing.trace(
      initializerCustomTokenWallet.methods
        .burn({
          amount,
          remainingGasTo: initializer.address,
          callbackTo: mergePool.address,
          payload: burnPayload.value0,
        })
        .send({
          from: initializer.address,
          amount: locklift.utils.toNano(10),
        }),
    );

    logger.log(`Event initialization tx: ${tx.id.hash}`);

    const events = await everscaleSolanaEventConfiguration
      .getPastEvents({ filter: "NewEventContract" })
      .then(e => e.events);

    expect(events).to.have.lengthOf(1, "Everscale event configuration failed to deploy event");

    const [
      {
        data: { eventContract: expectedEventContract },
      },
    ] = events;

    logger.log(`Expected event address: ${expectedEventContract}`);

    eventContract = locklift.factory.getDeployedContract("MultiVaultEverscaleSolanaEventAlien", expectedEventContract);
  });

  it("Check event contract exists", async () => {
    expect(Number(await locklift.provider.getBalance(eventContract.address))).to.be.greaterThan(
      0,
      "Event contract balance is zero",
    );
  });

  it("Check total supply reduced", async () => {
    const totalSupply = await customTokenRoot.methods.totalSupply({ answerId: 0 }).call({ responsible: true });

    expect(Number(totalSupply.value0)).to.be.equal(mintAmount - amount, "Wrong total supply after burn");
  });

  it("Check initializer token balance reduced", async () => {
    const balance = await initializerCustomTokenWallet.methods.balance({ answerId: 0 }).call({ responsible: true });

    expect(Number(balance.value0)).to.be.equal(mintAmount - amount, "Wrong initializer token balance after burn");
  });

  it("Check event data after mutation", async () => {
    const decodedData = await eventContract.methods.getDecodedData({ answerId: 0 }).call({ responsible: true });

    expect(Number(decodedData.base_token_)).to.be.equal(alienTokenBase.token, "Wrong alien base token");

    const eventInitData = await eventContract.methods.getEventInitData({ answerId: 0 }).call({ responsible: true });

    const decodedEventData = await cellEncoder.methods
      .decodeMultiVaultAlienEverscaleSolana({
        data: eventInitData.value0.voteData.eventData,
      })
      .call();

    expect(Number(decodedEventData.base_token)).to.be.equal(alienTokenBase.token, "Wrong event data base token");
    expect(Number(decodedEventData.amount)).to.be.equal(
      Math.floor(amount / 10 ** (customTokenMeta.decimals - alienTokenMeta.decimals)),
      "Wrong event data amount",
    );
    expect(Number(decodedEventData.recipient)).to.be.equal(recipient, "Wrong event data recipient");
  });

  it("Confirm event", async () => {
    await processEvent(relays, eventContract.address, EventType.EverscaleSolana, EventAction.Confirm);
  });

  it("Close event", async () => {
    const balance = await locklift.provider.getBalance(eventContract.address);

    const { traceTree } = await locklift.tracing.trace(
      eventContract.methods.close().send({
        from: initializer.address,
        amount: locklift.utils.toNano(0.1),
      }),
    );

    expect(Number(await locklift.provider.getBalance(eventContract.address))).to.be.equal(
      0,
      "Event contract balance should be 0 after close",
    );

    expect(Number(traceTree?.getBalanceDiff(initializer.address))).to.be.greaterThan(
      Number(balance) - Number(locklift.utils.toNano(1)), // Greater than balance - 1 ton for fees
      "Initializer should get money back after close",
    );
  });
});
