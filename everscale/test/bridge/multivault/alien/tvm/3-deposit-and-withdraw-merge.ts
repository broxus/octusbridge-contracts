import { Address, Contract, getRandomNonce, toNano, TraceType } from "locklift";
import { Account } from "everscale-standalone-client/nodejs";
import { expect } from "chai";

import {
  AlienTokenWalletUpgradeableAbi,
  CellEncoderStandaloneAbi,
  ProxyMultiVaultAlien_V10Abi,
  StakingMockupAbi,
  TrustlessVerifierMockupAbi,
  TvmTvmEventConfigurationAbi,
  TokenRootAlienTVMAbi,
  TokenRootAbi,
  MergeRouterAbi,
  MergePool_V7Abi,
} from "../../../../../build/factorySource";

import { setupBridge } from "../../../../utils/bridge";
import { setupAlienMultiVault } from "../../../../utils/multivault/alien";
import { deployTokenRoot} from "../../../../utils/token";

const PSEUDO_BLOCK_PROOF = "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";
const TX_PROOF = "te6ccgECFAEAAqQACUYDpqoTkSWKTO5p3wgVHDkMXS0XJddxpxU5wZIjmBQGhlkACwEjt3zbpQHncIe4dckfTdrNL1YMEEO5B2JNihQSZRFDP3nMsAAAAAAAAAhgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHJoQv3yAAlIBMzsIIBAMCKEgBAY2dTNvHnmqzBwiOAAZpt6XyRXvFIAh41+Dv2LXl7icDAAEoSAEBF8LigW2UdBr0CsgQqk8YU+aBWohwni4xvur4SXGAysUAACIB4BMFIgHbEgYiASAIByhIAQHBPdSbbUcXgJSgB7XwqdZGNBphBItC9yk6t7b/yMIugAABAQEgCQFd4AZt0oDzuEPcOuSPpu1ml6sGCCHcg7EmxQoJMoihn7zmWAAAAAAAAAES0IX75MAKA1VNxvFF///oj4AV0Z4FvaXlb/gQdnpn+29d8hi+o7kjGBBMI7u7Kb/acqEwERALAUOAGW8lPa1q4u/I7rK+DuD8KuA+mNXco8duKf7rTuTZBr2wDAFDgAEX1xqTwGJUvejNsDmG/9KdHpyuv50QhG3iRORrhx8mcA0Bo4ABF9cak8BiVL3ozbA5hv/SnR6crr+dEIRt4kTka4cfJmAAAAAAAAAAAAAAAAAAADhAAAAAAAAAAAAAAABFm7auAAAAAAAAAAAAAAAAAAAAABAOAUOAARfXGpPAYlS96M2wOYb/0p0enK6/nRCEbeJE5GuHHyZ4DwAAACBDVVNUT01fR0lHQV9DSEFEACBDdXN0b20gR2lnYSBDaGFkKEgBAffwpCq+M3H64NrTX9UTDFiZjVhfA1aUWx+CrdASxUpyAAIoSAEBSBzX4lLczUKILjura+8+FTlyvYn0QwnhNwFhaidZhg4ABw==";
const EVENT_MSG_HASH = "0x1fd227cbfe5b6e6a55a52c3e53ba897de88c6feb80fd406547d6b2a6320ea0dc";

const customTokenMeta = {
  name: "Giga Chad",
  symbol: "GIGA_CHAD",
  decimals: 18,
};

const alienTokenBase = {
  chainId: -6001,
  token: new Address("0:ae8cf02ded2f2b7fc083b3d33fdb7aef90c5f51dc918c082611dddd94dfed395"),
  native_proxy_wallet: new Address("0:cb7929ed6b57177e477595f07707e15701f4c6aee51e3b714ff75a7726c835ed"),
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
  let alienProxy: Contract<ProxyMultiVaultAlien_V10Abi>;

  let alienTokenRoot: Contract<TokenRootAlienTVMAbi>;
  let customTokenRoot: Contract<TokenRootAbi>;
  let mergeRouter: Contract<MergeRouterAbi>;
  let mergePool: Contract<MergePool_V7Abi>;

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

    mergePool = locklift.factory.getDeployedContract("MergePool_V7", mergePoolAddress.pool);
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
            messageIndex: 2 as never,
            txBlockProof: PSEUDO_BLOCK_PROOF,
            txProof: TX_PROOF,
          },
        })
        .send({ from: bridgeOwner.address, amount: toNano(1.5), bounce: true }),
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
        amount: "450000000000",
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
          amount: "450000000000",
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
        destinationChainId: "-6001",
        baseToken: alienTokenBase.token,
        amount: "450",
        recipient: bridgeOwner.address,
        expectedGas: "0",
        remainingGasTo: bridgeOwner.address,
        sender: bridgeOwner.address,
      });
  });
});
