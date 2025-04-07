import { Address, Contract, getRandomNonce, toNano, TraceType } from "locklift";
import { Account } from "everscale-standalone-client/nodejs";
import { expect } from "chai";

import {
  AlienTokenWalletUpgradeableAbi,
  CellEncoderStandaloneAbi,
  ProxyMultiVaultAlien_V9Abi,
  StakingMockupAbi,
  TrustlessVerifierMockupAbi,
  TvmTvmEventConfigurationAbi,
  TokenRootAlienTVMAbi,
  TokenRootAbi,
  MergeRouterAbi,
  MergePool_V6Abi,
} from "../../../../../build/factorySource";

import { setupBridge } from "../../../../utils/bridge";
import { setupAlienMultiVault } from "../../../../utils/multivault/alien";
import { deployTokenRoot} from "../../../../utils/token";

const PSEUDO_BLOCK_PROOF = "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";
const TX_PROOF = "te6ccgECEQEAAmQACUYDXFY9MNxjcZt4kxQtQ+1l7TJ7dYUWhmVdtI/CdFBUZZoACQEjt3qe3B3Gl89YrOYT/P7Lpp8LMiaptrhESfm7coVDG5cmIAAAAAAAAA3QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFNn5KNmAAVIAjfkOIBAMCKEgBAcZnj3RBLeQ1VZJb0/dgrOrxJMF/UuHBOcgMme59pWsDAAEoSAEB/gN5YD2ZWRcO3J9LwHbHfnjFkJ0CRTrMVeOnPru24jIAACIB4BAFIgHdBwYoSAEBQhujTQhyuD6jTjeMrqipEQD+/x2Nm/T4+Xg1aKljQDYAAQEBIAgBXeAFT24O40vnrFZzCf5/ZdNPhZkTVNtcIiT83blCoY3LkxAAAAAAAAABvM/JRszACQN1Ot0hSv//6I+ABD2X/63dltLlFAx1syah3bhUrNnXq9kV/tBZIoJgGIPhIAAAAAAAAAAAAAAAAAAAPpAPDgoBo4AG6xJxJ3HnggHoP188HlhCSleIUWcnb9DEFCoYKIA+zOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFm7crAAAAAAAAAAAAAAAAAAAAABALAUOAHSfiuijzKhvGWI+QbUOyNL2p1pQl4o1e/IAxPY1/DpRwDAFDgAbrEnEnceeCAeg/XzweWEJKV4hRZydv0MQUKhgogD7M8A0AAAAgQ1VTVE9NX0dJR0FfQ0hBRAAgQ3VzdG9tIEdpZ2EgQ2hhZChIAQF24gtJuyg8mxkQDwrfagPYtWjt5YNNbwqHIRrf5jJGlgAH";
const EVENT_MSG_HASH = "0x3f2dc882dc520b988bf2c108c1ce249504be1d04b8b108657d06d0ba7950de9d";

const customTokenMeta = {
  name: "Giga Chad",
  symbol: "GIGA_CHAD",
  decimals: 18,
};

const alienTokenBase = {
  chainId: -6001,
  token: new Address("0:21ecbffd6eecb69728a063ad99350eedc2a566cebd5ec8aff682c9141300c41f"),
  native_proxy_wallet: ,
  name: customTokenMeta.name,
  symbol: customTokenMeta.symbol,
  decimals: customTokenMeta.decimals,
  remainingGasTo: new Address()
};

const alienTokenMeta = {
  name: "Custom Giga Chad",
  symbol: "CUSTOM_GIGA_CHAD",
  decimals: 9,
};

describe("Deposit and withdraw alien TVM token with merging", () => {
  let bridgeOwner: Account;

  let staking: Contract<StakingMockupAbi>;
  let trustlessVerifier: Contract<TrustlessVerifierMockupAbi>;
  let alienTvmTvmEventConfiguration: Contract<TvmTvmEventConfigurationAbi>;
  let cellEncoder: Contract<CellEncoderStandaloneAbi>;
  let initializerAlienTokenWallet: Contract<AlienTokenWalletUpgradeableAbi>;
  let alienProxy: Contract<ProxyMultiVaultAlien_V9Abi>;

  let alienTokenRoot: Contract<TokenRootAlienTVMAbi>;
  let customTokenRoot: Contract<TokenRootAbi>;
  let mergeRouter: Contract<MergeRouterAbi>;
  let mergePool: Contract<MergePool_V6Abi>;

  before("Setup bridge", async () => {
    [, bridgeOwner, staking, cellEncoder, trustlessVerifier] = await setupBridge([]);
    [, , , , alienProxy, alienTvmTvmEventConfiguration] = await setupAlienMultiVault(
      bridgeOwner,
      staking,
      trustlessVerifier,
    );
  });

  it("Deploy custom token root", async () => {
    customTokenRoot = await deployTokenRoot(
      customTokenMeta.name,
      customTokenMeta.symbol,
      customTokenMeta.decimals,
      alienProxy.address,
    );
  });

  it("Deploy alien token root", async () => {
    await locklift.transactions.waitFinalized(
      alienProxy.methods
        .deployTVMAlienToken({
          ...alienTokenBase,
          ...alienTokenMeta,
          remainingGasTo: bridgeOwner.address,
        })
        .send({ from: bridgeOwner.address, amount: toNano(15), bounce: true }),
    );

    const alienTokenRootAddress = await alienProxy.methods
      .deriveTVMAlienTokenRoot({
        ...alienTokenBase,
        ...alienTokenMeta,
        answerId: 0,
      })
      .call({ responsible: true });

    alienTokenRoot = locklift.factory.getDeployedContract("TokenRootAlienTVM", alienTokenRootAddress.value0);
  });

  it("Deploy merge router", async () => {
    await locklift.transactions.waitFinalized(
      alienProxy.methods
        .deployMergeRouter({ token: alienTokenRoot.address })
        .send({ from: bridgeOwner.address, amount: toNano(5), bounce: true }),
    );

    const mergeRouterAddress = await alienProxy.methods
      .deriveMergeRouter({
        answerId: 0,
        token: alienTokenRoot.address,
      })
      .call({ responsible: true });

    mergeRouter = locklift.factory.getDeployedContract("MergeRouter", mergeRouterAddress.router);
  });

  it("Deploy merge pool", async () => {
    const nonce = getRandomNonce();

    await locklift.transactions.waitFinalized(
      alienProxy.methods
        .deployMergePool({
          nonce,
          tokens: [alienTokenRoot.address, customTokenRoot.address],
          canonId: 1,
        })
        .send({ from: bridgeOwner.address, amount: toNano(5), bounce: true }),
    );

    const mergePoolAddress = await alienProxy.methods
      .deriveMergePool({
        nonce,
        answerId: 0,
      })
      .call({ responsible: true });

    mergePool = locklift.factory.getDeployedContract("MergePool_V6", mergePoolAddress.pool);
  });

  it("Enable merge pool tokens", async () => {
    await locklift.transactions.waitFinalized(
      mergePool.methods
        .enableAll()
        .send({ from: bridgeOwner.address, amount: toNano(1), bounce: true }),
    );

    const tokens = await mergePool.methods
      .getTokens({ answerId: 0 })
      .call({ responsible: true });

    expect(tokens._tokens[0][1].enabled).to.be.equal(true, "Wrong alien status");
    expect(tokens._tokens[1][1].enabled).to.be.equal(true, "Wrong canon status");
    expect(tokens._canon.toString()).to.be.equal(customTokenRoot.address.toString(), "Wrong canon token");
  });

  it("Set merge pool in router", async () => {
    await locklift.transactions.waitFinalized(
      mergeRouter.methods
        .setPool({ pool_: mergePool.address })
        .send({ from: bridgeOwner.address, amount: toNano(1), bounce: true }),
    );

    const pool = await mergeRouter.methods
      .getPool({ answerId: 0 })
      .call({ responsible: true });

    expect(pool.value0.toString()).to.be.equal(mergePool.address.toString(), "Wrong pool in router");
  });

  it("Allow tx verifier to approve txs", async () => {
    await locklift.transactions.waitFinalized(
      trustlessVerifier.methods
        .setApprove({ _approve: true })
        .send({ from: bridgeOwner.address, amount: toNano(2), bounce: true }),
    );
  });

  it("Process TVM-TVM alien deposit event", async () => {
    const { traceTree } = await locklift.tracing.trace(
      alienTvmTvmEventConfiguration.methods
        .deployEvent({
          eventVoteData: {
            msgHash: EVENT_MSG_HASH,
            messageIndex: 0 as never,
            txBlockProof: PSEUDO_BLOCK_PROOF,
            txProof: TX_PROOF,
          },
        })
        .send({ from: bridgeOwner.address, amount: toNano(6), bounce: true}),
      { allowedCodes: { compute: [null] } },
    );

    const tokenWalletAddress = traceTree?.findByTypeWithFullData({
      type: TraceType.FUNCTION_CALL,
      name: "acceptMint",
    })!;

    initializerAlienTokenWallet = locklift.factory.getDeployedContract(
      "AlienTokenWalletUpgradeable",
      tokenWalletAddress[0].contract.contract.address
    );

    return expect(traceTree)
      .to.emit("NewEventContract")
      .count(1)
      .and.to.emit("Confirmed")
      .count(1)
      .and.to.call("acceptMint")
      .count(1)
      .withNamedArgs({
        amount: "500000000000",
        remainingGasTo: bridgeOwner.address,
        notify: true,
      });
  });

  it("Burn alien TVM token in favor of merge pool", async () => {
    const burnPayload = await cellEncoder.methods
      .encodeMergePoolBurnWithdrawPayloadTVM({
        targetToken: alienTokenRoot.address,
        recipient: bridgeOwner.address,
        expectedGas: 0,
        payload: "",
      })
      .call()
      .then((r) => r.value0);

    const { traceTree } = await locklift.tracing.trace(
      initializerAlienTokenWallet.methods
        .burn({
          amount: "500000000000",
          remainingGasTo: bridgeOwner.address,
          callbackTo: mergePool.address,
          payload: burnPayload,
        })
        .send({ from: bridgeOwner.address, amount: toNano(10), bounce: true }),
    );

    return expect(traceTree)
      .to.emit("TvmTvmAlien")
      .count(1)
      .withNamedArgs({
        chainId: "-6001",
        token: alienTokenBase.token,
        amount: "500",
        recipient: bridgeOwner.address,
        expectedGas: "0",
        remainingGasTo: bridgeOwner.address,
        sender: bridgeOwner.address,
      });
  });
});
