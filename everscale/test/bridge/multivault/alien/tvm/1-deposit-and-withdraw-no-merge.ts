import { Contract, toNano, TraceType } from "locklift";
import { Account } from "everscale-standalone-client/nodejs";
import { expect } from "chai";

import {
  AlienTokenWalletUpgradeableAbi,
  CellEncoderStandaloneAbi,
  ProxyMultiVaultAlien_V10Abi,
  StakingMockupAbi,
  TrustlessVerifierMockupAbi,
  TvmTvmEventConfigurationAbi,
  BridgeTokenFeeAbi,
  TokenRootAbi
} from "../../../../../build/factorySource";

import { setupBridge } from "../../../../utils/bridge";
import {getBridgeTokenFee, setDefaultFee, setupAlienMultiVault} from "../../../../utils/multivault/alien";

const PSEUDO_BLOCK_PROOF = "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";
const TX_PROOF = "te6ccgECFAEAArQACUYDLiVNpG2z9KLgzAIzT4Dd1l/MHHjd+KL0BpckY4MZu2wACwEjt35aJ8RIN5PEPbE62ZXfMXx90pttbZXYvPd7/NUxwlzYoAAAAAAAAAgQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG1n/oYAAAdIBBCZMIBAMCKEgBAXA5dB4mccVNKPb3BejJCJTTQTKoohLnb7ZpI03/gQcrAAEoSAEBoEV6XdoX/I14/PQyjpJI4ObOfKGkbnicrBKiqkd/h+QAACIB4BMFIgHbBwYoSAEBJr86Q19dvCzEUEqBo9QektYFoeZl7FVztBzM5YFRtaoAASIBIBIIAQEgCQFd4ActE+IkG8niHtidbMrvmL4+6U22tsrsXnu9/mqY4S5sUAAAAAAAAAEGz/0MAMAKA1VNX3wz///oj4ALB86Z3/Rp4X5zTSz7YF0+SkUHU143BNWNX6YE0w2JWgEwERALAUOABJdbJ2T5LljPrsiP3S3ZibAq5Ikh5mJjqAHsCgqkvpSQDAFDgAEX1xqTwGJUvejNsDmG/9KdHpyuv50QhG3iRORrhx8mcA0Bo4ABF9cak8BiVL3ozbA5hv/SnR6crr+dEIRt4kTka4cfJmAAAAAAAAAAAAAAAAAAAD6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARZu2rhAOAWMAAAAAAAAAAAAAAAAAAAAAgAEX1xqTwGJUvejNsDmG/9KdHpyuv50QhG3iRORrhx8meA8AAAAgQ1VTVE9NX0dJR0FfQ0hBRAAgQ3VzdG9tIEdpZ2EgQ2hhZChIAQEOE64SKh4o1kAP+Vp66L0+8aG1wfc+NSvKZGDligBiFgABKEgBAdOF47hD//VlGnXtZAf6QgmNfDAhU9cVVDl1sHOpA2Z6AAc=";
const EVENT_MSG_HASH = "0x44d60b7462e2701eb0f8c57dcf205a4a28d92981ec301abe519b5d353c41c8d1";

const incomingFee = 10000;
const outgoingFee = 10000;

describe("Deposit and withdraw alien TVM token with no merging", () => {
  let bridgeOwner: Account;

  let staking: Contract<StakingMockupAbi>;
  let trustlessVerifier: Contract<TrustlessVerifierMockupAbi>;
  let alienTvmTvmEventConfiguration: Contract<TvmTvmEventConfigurationAbi>;
  let cellEncoder: Contract<CellEncoderStandaloneAbi>;
  let initializerAlienTokenWallet: Contract<AlienTokenWalletUpgradeableAbi>;
  let alienProxy: Contract<ProxyMultiVaultAlien_V10Abi>;
  let bridgeTokenFee: Contract<BridgeTokenFeeAbi>;
  let tokenRoot: Contract<TokenRootAbi>;

  before("Setup bridge", async () => {
    [, bridgeOwner, staking, cellEncoder, trustlessVerifier] = await setupBridge([]);
    [, , , , alienProxy, alienTvmTvmEventConfiguration] = await setupAlienMultiVault(
      bridgeOwner,
      staking,
      trustlessVerifier,
    );

    await setDefaultFee(alienProxy, bridgeOwner, incomingFee, outgoingFee);
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
            messageIndex: 1 as never,
            txBlockProof: PSEUDO_BLOCK_PROOF,
            txProof: TX_PROOF,
          },
        })
        .send({ from: bridgeOwner.address, amount: toNano(18), bounce: true }),
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

    tokenRoot = await initializerAlienTokenWallet.methods.root({answerId:0})
      .call()
      .then((a) => locklift.factory.getDeployedContract('TokenRoot',a.value0));

    bridgeTokenFee = await getBridgeTokenFee(tokenRoot, alienProxy);

    expect(traceTree)
      .to.call("deployTokenFee")
      .count(1)
      .withNamedArgs({_token: tokenRoot.address, _remainingGasTo: bridgeOwner.address});

    expect(traceTree)
      .to.call("accumulateFee")
      .count(1)
      .withNamedArgs({_fee: '50'});

    return expect(traceTree)
      .to.emit("NewEventContract")
      .count(1)
      .and.to.emit("Confirmed")
      .count(1)
      .and.to.call("acceptMint")
      .count(1)
      .withNamedArgs({
        amount: (500 - 50).toString(),
        remainingGasTo: bridgeOwner.address,
        notify: true,
      });
  });

  it("Burn alien TVM token in favor of proxy", async () => {
    const burnPayload = await cellEncoder.methods
      .encodeAlienBurnPayloadTVM({
        recipient: bridgeOwner.address,
        expectedGas: 0,
        payload: "",
      })
      .call()
      .then((r) => r.value0);

    const { traceTree } = await locklift.tracing.trace(
      initializerAlienTokenWallet.methods
        .burn({
          amount: 450,
          remainingGasTo: bridgeOwner.address,
          callbackTo: alienProxy.address,
          payload: burnPayload,
        })
        .send({ from: bridgeOwner.address, amount: toNano(10), bounce: true }),
    );

    return expect(traceTree)
      .to.emit("TvmTvmAlien")
      .count(1)
      .withNamedArgs({
        destinationChainId: "-239",
        baseToken: "0:583e74ceffa34f0bf39a6967db02e9f252283a9af1b826ac6afd3026986c4ad0",
        name: "Custom Giga Chad",
        symbol: 'CUSTOM_GIGA_CHAD',
        decimals: '9',
        nativeProxyWallet: "0:24bad93b27c972c67d76447ee96ecc4d815724490f33131d400f60505525f4a4",
        sender: bridgeOwner.address,
        recipient: bridgeOwner.address,
        amount: (450 - 45).toString(),
        expectedGas: "0",
        remainingGasTo: bridgeOwner.address,
        payload: "te6ccgEBAQEAAgAAAA=="
      });
      });

  it("Upgrade bridge token fee", async () => {
    const bridgeTokenFeeCode = locklift.factory.getContractArtifacts(
                "BridgeTokenFee"
            ).code;

    await alienProxy.methods.setTokenFeeCode({_code: bridgeTokenFeeCode}).send({
      from: bridgeOwner.address,
      amount: toNano(0.2),
    });

    const stateBefore = await bridgeTokenFee.getFields()
          .then((f) => f.fields);

    const { traceTree } = await locklift.tracing.trace(
      alienProxy.methods.upgradeTokenFee({
        _token: tokenRoot.address,
        _remainingGasTo: bridgeOwner.address
      }).send({
        from: bridgeOwner.address,
        amount: toNano(6),
        bounce: false
      })
    );

    const stateAfter = await bridgeTokenFee.getFields()
            .then((f) => f.fields);

    return expect(JSON.stringify(stateBefore)).to.be.equal(JSON.stringify(stateAfter));
  });

  it("Withdraw accumulated fee from bridgeTokenFee", async () => {

     const { traceTree } = await locklift.tracing.trace(
       await alienProxy.methods.withdrawTokenFee({
         _tokenRoot: tokenRoot.address,
         _recipient: bridgeOwner.address
       }).send({
          from: bridgeOwner.address,
          amount: toNano(10)
       })
     );

     expect(traceTree)
      .to.call("mint")
      .count(1)
      .withNamedArgs({amount: '95', recipient: bridgeOwner.address});

     let bridgeOwnerWallet = await tokenRoot.methods.walletOf({answerId:0, walletOwner: bridgeOwner.address})
       .call()
       .then((a) => locklift.factory.getDeployedContract('AlienTokenWalletUpgradeable', a.value0))

     let balance = await initializerAlienTokenWallet.methods
        .balance({ answerId: 0 })
        .call()
        .then((b) => b.value0);

     let diff = traceTree!.tokens.getTokenBalanceChange(bridgeOwnerWallet);
     return expect(+diff).to.be.equal(95);
  });
});
