import { Contract, toNano } from "locklift";
import { Account } from "everscale-standalone-client/nodejs";
import { expect } from "chai";

import {
  CellEncoderStandaloneAbi,
  ProxyMultiVaultNative_V8Abi,
  StakingMockupAbi,
  TokenRootAbi,
  TokenWalletAbi,
  TrustlessVerifierMockupAbi,
  TvmTvmEventConfigurationAbi,
  BridgeTokenFeeAbi,
} from "../../../../../build/factorySource";

import { setupBridge } from "../../../../utils/bridge";
import {
  deployBridgeTokenFeeAndSetFee,
  setupNativeMultiVault
} from "../../../../utils/multivault/native";
import { deployTokenRoot, mintTokens } from "../../../../utils/token";

const PSEUDO_BLOCK_PROOF = "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";
const TX_PROOF = "te6ccgECFAEAAqQACUYDmFRHIMhKIXgI7FLZZfgBruBNdTbxkMOI/OUkefFfOy4ACwEjt3ksVmK2NeherBkkOIjd+pedbZ+N41KxuBnLTgQnyo5MQAAAAAAAAA9QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPNoQwEeAAlICIEagIBAMCKEgBAQ5jmjlIq4xYVDPuQv+J7Usykg2HWvo2sZZQOQAHjZCDAAEoSAEBMqnNbfxehql+KoSAP8xMdRF/sAblBve80hZ1GBLWw9sAACIB4BMFIgHbEgYiASAIByhIAQH4JOLP078Pw5xi05WlSvPE84RvPfR8H/WmmsCHJbXX1QABAQEgCQFd4ASWKzFbGvQvVgySHERu/UvOts/G8alY3AzlpwIT5UcmIAAAAAAAAAHw0IYCPMAKA1VgX/jO///oj4AV0Z4FvaXlb/gQdnpn+29d8hi+o7kjGBBMI7u7Kb/acqEwERALAUOAGW8lPa1q4u/I7rK+DuD8KuA+mNXco8duKf7rTuTZBr2wDAFDgAEX1xqTwGJUvejNsDmG/9KdHpyuv50QhG3iRORrhx8mcA0Bo4ABF9cak8BiVL3ozbA5hv/SnR6crr+dEIRt4kTka4cfJmAAAAAAAAAAAAAAAAAAAC0AAAAAAAAAAAAAAABKA0GPAAAAAAAAAAAAAAAAAAAAABAOAUOAARfXGpPAYlS96M2wOYb/0p0enK6/nRCEbeJE5GuHHyZ4DwAAACBDVVNUT01fR0lHQV9DSEFEACBDdXN0b20gR2lnYSBDaGFkKEgBAdEYavozcdY1neiNcdB4KSmJVDW2slVMGCbkH/d3xSVXAAIoSAEBpmE1tZu1rFuPeRaQ2qYvEaYHf2H9RgNpnbuFEU3NU58ABg==";
const EVENT_MSG_HASH = "0xeafd8eecaba5d76aea9d461d1d5e65031c363d2427f7eaa244492970094f0ee6";

const tokenMeta = {
  name: "Custom Giga Chad",
  symbol: "CUSTOM_GIGA_CHAD",
  decimals: 9,
};

const mintAmount = 1000;
const amount = 500;
const incomingFee = 10000;
const outgoingFee = 10000;

describe("Deposit and withdraw native TVM token", () => {
  let bridgeOwner: Account;

  let staking: Contract<StakingMockupAbi>;
  let trustlessVerifier: Contract<TrustlessVerifierMockupAbi>;
  let nativeTvmTvmEventConfiguration: Contract<TvmTvmEventConfigurationAbi>;
  let cellEncoder: Contract<CellEncoderStandaloneAbi>;
  let initializerTokenWallet: Contract<TokenWalletAbi>;
  let nativeProxy: Contract<ProxyMultiVaultNative_V8Abi>;
  let tokenRoot: Contract<TokenRootAbi>;
  let bridgeTokenFee: Contract<BridgeTokenFeeAbi>;
  let nativeProxyTokenWallet: Contract<TokenWalletAbi>;

  before("Setup bridge", async () => {
    [, bridgeOwner, staking, cellEncoder, trustlessVerifier] = await setupBridge([]);
    [, , , , nativeProxy, nativeTvmTvmEventConfiguration] = await setupNativeMultiVault(
      bridgeOwner,
      staking,
      trustlessVerifier
    );
  });

  it("Allow tx verifier to approve txs", async () => {
    await locklift.transactions.waitFinalized(
      trustlessVerifier.methods
        .setApprove({ _approve: true })
        .send({ from: bridgeOwner.address, amount: toNano(2), bounce: true }),
    );
  });

  it("Deploy native token root", async () => {
    tokenRoot = await deployTokenRoot(
      tokenMeta.name,
      tokenMeta.symbol,
      tokenMeta.decimals,
      bridgeOwner.address,
      0
    );

    initializerTokenWallet = await tokenRoot.methods
      .walletOf({ answerId: 0, walletOwner: bridgeOwner.address })
      .call()
      .then((w) => locklift.factory.getDeployedContract("TokenWallet", w.value0));
  });

  it("Deploy native bridge token fee and set default fee", async () => {
    [bridgeTokenFee, nativeProxyTokenWallet] = await deployBridgeTokenFeeAndSetFee(
      bridgeOwner,
      tokenRoot,
      nativeProxy,
      incomingFee,
      outgoingFee
    );

  });

  it("Mint native tokens to bridge owner", async () => {
    await mintTokens(bridgeOwner, [bridgeOwner], tokenRoot, mintAmount);
  });

  it("Withdraw native TVM token through proxy", async () => {
    const payload = await cellEncoder.methods
      .encodeNativeTransferPayloadTVM({
        recipient: bridgeOwner.address,
        chainId: -6001,
        ...tokenMeta,
        expectedGas: 0,
        payload: '',
      })
      .call()
      .then(t => t.value0);

    const { traceTree } = await locklift.tracing.trace(
      initializerTokenWallet.methods
        .transfer({
          amount,
          recipient: nativeProxy.address,
          deployWalletValue: toNano(0.2),
          remainingGasTo: bridgeOwner.address,
          notify: true,
          payload,
        })
        .send({ from: bridgeOwner.address, amount: toNano(10), bounce: true }),
    );

    // const events = await nativeProxy.getPastEvents({filter: "TvmTvmNative" as const});
    // console.log(events.events[0].transaction.boc);

    expect(traceTree)
      .to.call("accumulateFee")
      .count(1)
      .withNamedArgs({_fee: '50'});

    return expect(traceTree)
      .to.emit("TvmTvmNative")
      .count(1)
      .withNamedArgs({
        destinationChainId: "-6001",
        baseToken: tokenRoot.address,
        name: tokenMeta.name,
        symbol: tokenMeta.symbol,
        decimals: tokenMeta.decimals.toString(),
        nativeProxyWallet: nativeProxyTokenWallet.address,
        sender: bridgeOwner.address,
        recipient: bridgeOwner.address,
        amount: (500 - 50).toString(),
        attachedGas: "9342662000",
        expectedGas: "0",
        remainingGasTo: bridgeOwner.address
      });
  });

  it.skip("Process TVM-TVM native deposit event", async () => {
    const { traceTree } = await locklift.tracing.trace(
      nativeTvmTvmEventConfiguration.methods
        .deployEvent({
          eventVoteData: {
            msgHash: EVENT_MSG_HASH,
            messageIndex: 2 as never,
            txBlockProof: PSEUDO_BLOCK_PROOF,
            txProof: TX_PROOF,
          },
        })
        .send({ from: bridgeOwner.address, amount: toNano(6), bounce: true }),
      { allowedCodes: { compute: [51] } },
    );

    return expect(traceTree)
      .to.emit("NewEventContract")
      .count(1)
      .and.to.emit("Confirmed")
      .count(1)
      .and.to.call("acceptTransfer")
      .count(1)
      .withNamedArgs({
        amount: "500",
        sender: nativeProxy.address,
        remainingGasTo: bridgeOwner.address,
        notify: true,
      });
  });

  it("Upgrade bridge token fee", async () => {
    const bridgeTokenFeeCode = locklift.factory.getContractArtifacts(
      "BridgeTokenFee"
    ).code;

    await nativeProxy.methods
      .setTokenFeeCode({_code: bridgeTokenFeeCode})
      .send({
        from: bridgeOwner.address,
        amount: toNano(0.2),
      });

    const stateBefore = await bridgeTokenFee
      .getFields()
      .then((f) => f.fields);

    await locklift.transactions.waitFinalized(
      nativeProxy.methods
        .upgradeTokenFee({
          _token: nativeProxyTokenWallet.address,
          _remainingGasTo: bridgeOwner.address
        })
        .send({
          from: bridgeOwner.address,
          amount: toNano(6),
          bounce: false
        })
    );

    const stateAfter = await bridgeTokenFee
      .getFields()
      .then((f) => f.fields);

    return expect(JSON.stringify(stateBefore)).to.be.equal(JSON.stringify(stateAfter));
  });

  it.skip("Withdraw accumulated fee from bridgeTokenFee", async () => {
     const { traceTree } = await locklift.tracing.trace(
       await nativeProxy.methods.withdrawTokenFee({
         _tokenRoot: nativeProxyTokenWallet.address,
         _recipient: bridgeOwner.address
       }).send({
          from: bridgeOwner.address,
          amount: toNano(10)
       }),{ allowedCodes: { compute: [51] } }
     );

     let diff = traceTree!.tokens.getTokenBalanceChange(initializerTokenWallet);

     return expect(diff).to.be.equal('50');
  });
});
