import { Contract, toNano } from "locklift";
import { Account } from "everscale-standalone-client/nodejs";
import { expect } from "chai";

import {
  CellEncoderStandaloneAbi,
  TvmTvmEventConfigurationAbi,
  ProxyMultiVaultNative_V7Abi,
  StakingMockupAbi,
  TokenRootAbi,
  TokenWalletAbi,
  TrustlessVerifierMockupAbi,
  BridgeTokenFeeAbi,
} from "../../../../../build/factorySource";

import { setupBridge } from "../../../../utils/bridge";
import {
  deployBridgeTokenFeeAndSetFee,
  setupNativeMultiVault
} from "../../../../utils/multivault/native";
import { deployTokenRoot, mintTokens } from "../../../../utils/token";

const PSEUDO_BLOCK_PROOF = "te6ccgECMQEABvsACUYDhLS7wsfM2LdpEZWOa0TTwoxXkH5AuYlVYgr54whZQZgAHAEjSObboMLQGUJvPP8c9RbGPevXD1W6Xb0gb596CqByA4wpZ+Q9bSIRAiQQEe9Vu///6I8QDw4DI4lKM/b8Kv2s9mSlMLszcYucn2Uyy8zudyW2o8utwYDXxqGlC3mfsnGLHrWJ+PHv/ra5HLuBJ7Z2l9/UZp/5sqDFoWz7ZEANDAQhC6gKoKugogUiDUUBVBV0FEALBiILVK3VMQ5ACgcip78U2OmUbwxzHtlRjG+QzZk+mnGF5r/yXHdNyxLv97GhiRDy6dOK6mx0yjeGOY9sqMY3yGbMn004wvNf+S47puWJd/vY0MVAAAAAZwc778pEPLp05AkIKEgBASielHqfOr4yCLRwOmOWROWJJWQqKsdiP5XYo6jyH42OAAAoSAEBvNloidsDsnKcfAYJlQmzKdaD2Jhur//NcI6UMCQJS98ACShIAQGMTv4PyPvA3WM5o3l5pCew9VuKMcDHgRuum0MjfilP3AAUKEgBAWVCttzfR9d7zjgjPaa9B3kojpx6l60oN5+XvxIm3LlaABQoSAEBJsH0ufyK+ArlD58XtJWWhRvr9Iz+gpCY+mn74/lVePQAGShIAQFdXdffZ+xpHFeI0EVnVVbDCwnIVKC/jB0urIc73d8UFQAXKEgBAZTBKLTVDUWjNaypj/J/clzh0TkNKNV8Eia3EHtc/mJPABQoSAEBPKx3wC1YL45+VSlz+NXppPyd6c5D/tYtsIv75FN5POYAAShIAQHDjyGxY0Gt5ov0cN6VJ1aPuidfBpDUjPwcXsiuV6AIdAABAgLMFxICAUgUEwCBXukLNl5vHBhMkCvY8mS8xnPbQPfebfOeL9g7g3p4SLJ7/W5F1GYPzI37m+vZnlhO90DkL4DCi0OY1wOKHN/xIOgCASAWFQCBB7A7KYIlvzGxau1gUOFv31TpYkLawikwn2mOqK6EW5R1Kn+ZwFV10MlA6+7OMqSMftOil3yLIV1b4brUSpB6QeAAgQvxR+vMXXm/K4YHx9IsCCejlsjsbFSowb6E94CEgIslvpkVD2jtO+yQqsx6KdZUcKrN80ecIaHxEVsj394BSkKgAgEgHRgCASAcGQIBIBsaAIEqBZzroNcaSy99QGQ6lphchyJ+Evxtkw0fg763mRcQsM2qcNlxyhROw+ZpFTI3aoCTDRubIgSi8hUeoOuo/yYDoACBEXBlYiswhnQw6dSD9wzJoQR7RVmeQucUONWmn8KlxtftMSi4z0ydGnnIXj2lsM/IKUHTpiglgwcxHH2zsXTKQOAAgURV6q6kvWgqMJTPCTZZOSlASJHxXjzncopuq0bDxBtFkUIAsqoOkzI+H5jbw44Qr0rzxW9+Pohb8GmD+zHS0PDIAgEgIR4CASAgHwCBLVUFzhjOPDZxf7XhRVNfGuaqQ4B1kjkKRVgW8rxhT0aJjeq21+eTvU6hwNwDbmzU1bOck2AAwn3KCabCbFEBwyAAgQHYYaWb3MrQUtDfexXpk+VC4Cjgefrny5tHRn0wumjELJbtwFQxCjeDyJfR5sytiWh9tGl5J+Y8m8COQ1mOGMEgAIFS+erWDQQveFil2pGifxG3bCpZNzwYaKWZ1bTrZDTSB8fNuUG5aWX0v7eiGqGyeZ/KcjlyhU4cXEsgrh8IZvMwWCQQEe9Vu///6I8vLi0jJIlKM/b88uV9A2T/kb14au5lALXeHbgarzadxsBva+O0KV7dCfnrAdm46b+bpA32/FpprKlE96B5AfgCCxIdUmL+Ro2+HMAsKyokAxnMpWoDqsus4kO5rKAEJyYlAAEQAEOwAAAAAEAAAAAAAAAAKA6rLrOJDuaygAoDqsus4kO5rKAEAQPQQCgB01AABeRoADAf2AAAAzg5334AAAADODnffnF3EOdeDn5WOnVSgQ4Os7YMoicXFhfToPU8usnhU92NQ4P3a9ubkm1M+hgnAEGWZ0OGfLhQGebNHRdHS2C4/sD4IAIfIGACH26IADAf0z8iBJIpABVQHVZdZxIdzWUAIChIAQGDWo24httYP0hI26JzqcFGckVHAif5I9vw3oEKwNve4gAFAAECAAMAIChIAQG5mPKM1oCY0Q7jITYb0uDn3+kWxPdC1Nr86vQOs3aiRwAXKEgBAXUHS/D6zqPKJu6S5VrmN3ev3Dpc15UdPJdUFYC6EbWBAAEhpJvHqYgAAAAAAAEABgP7AAAAAAD/////AAAAAAAAAABn5ECTASQAAABnB0syAAAAAGcHSzIDX/1GPgBD5AwABgP6AAYDCsQAAAAgAAAAAAwDFi4wKEgBAYASaUDQ8n58Ymn/CumZtTI9pVq5UpgCEIGl9yGE0tezAAA=";
const TX_PROOF = "te6ccgECDwEAAj0ACUYDw1rp9Ku6yNzoYVd6iOLa/BZvsX53EO2TG0wq7xMOCoEACQEjt3BXST2rRjm0Vb2TBcDCzETTDPSOWxhbbMBaDRAskeD+gAAAAAAAAA4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN9n5KQMAAVIBdrE4IBAMCKEgBAarY9sbSgTS735jc+WC2o1fAr+3+Ua5RMc/yoh555CYpAAEoSAEBI3lNFdL3x5zkQKtxUZRz89rGhG2l4w7Wobl5TJZGFKMAACIB4A4FIgHdBwYoSAEBOQujt3cR8md9dFatZ091E63MUITPenc+tROr8ajLIwgAAQEBIAgBXeAAK6Se1aMc2ireyYLgYWYiaYZ6Ry2MLbZgLQaIFkjwf0AAAAAAAAABxM/JSBjACQFzWQDMrf//6I+ABD2X/63dltLlFAx1syah3bhUrNnXq9kV/tBZIoJgGIPgAAAAAAAAAAAAAAAAAAA+kAoBo4AG6xJxJ3HnggHoP188HlhCSleIUWcnb9DEFCoYKIA+zOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABKDfaAoAAAAAAAAAAAAAAAAAAAABALAUOABusScSdx54IB6D9fPB5YQkpXiFFnJ2/QxBQqGCiAPszwDAFDgAbrEnEnceeCAeg/XzweWEJKV4hRZydv0MQUKhgogD7M8A0AAChIAQFTBN/qmKsA/tuRfXJsQmpGgIgtgqXzKOSSKdOKc3MD4wAF";
const EVENT_MSG_HASH = "0x2c2cfd5548b322a208d1c8bfdaa91cde8ff2a1c95464fb1ec2107a09482da025";

const tokenMeta = {
  name: "Custom Giga Chad",
  symbol: "CUSTOM_GIGA_CHAD",
  decimals: 9,
};

const mintAmount = 1000;
const amount = 500;
const fee = 10000;

describe("Deposit and withdraw native TVM token with no merging", () => {
  let bridgeOwner: Account;

  let staking: Contract<StakingMockupAbi>;
  let trustlessVerifier: Contract<TrustlessVerifierMockupAbi>;
  let nativeTvmTvmEventConfiguration: Contract<TvmTvmEventConfigurationAbi>;
  let cellEncoder: Contract<CellEncoderStandaloneAbi>;
  let initializerTokenWallet: Contract<TokenWalletAbi>;
  let nativeProxy: Contract<ProxyMultiVaultNative_V7Abi>;
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
      1934
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
      fee
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

    return expect(traceTree)
      .to.emit("TvmTvmNative")
      .count(1)
      .withNamedArgs({
        destinationChainId: "-6001",
        baseToken: tokenRoot.address,
        name: tokenMeta.name,
        symbol: tokenMeta.symbol,
        decimals: tokenMeta.decimals.toString(),
        nativeProxyWallet: nativeProxyTokenWallet,
        sender: bridgeOwner.address,
        recipient: bridgeOwner.address,
        amount: "500",
        attachedGas: "0",
        expectedGas: "0",
        remainingGasTo: bridgeOwner.address
      });
  });

  it("Process TVM-TVM native deposit event", async () => {
    const { traceTree } = await locklift.tracing.trace(
      nativeTvmTvmEventConfiguration.methods
        .deployEvent({
          eventVoteData: {
            msgHash: EVENT_MSG_HASH,
            messageIndex: 0 as never,
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

    await nativeProxy.methods.setBridgeTokenFeeCode({_code: bridgeTokenFeeCode}).send({
      from: bridgeOwner.address,
      amount: toNano(0.2),
    });

    const stateBefore = await bridgeTokenFee.getFields()
          .then((f) => f.fields);

    const { traceTree } = await locklift.tracing.trace(
      nativeProxy.methods.upgradeBridgeTokenFee({
        _token: nativeProxyTokenWallet.address,
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
       await nativeProxy.methods.withdrawTokenFee({
         _token: nativeProxyTokenWallet.address,
         _recipient: bridgeOwner.address
       }).send({
          from: bridgeOwner.address,
          amount: toNano(10)
       })
     );

     let balance = await initializerTokenWallet.methods
            .balance({ answerId: 0 })
            .call()
            .then((b) => b.value0);

     let diff = traceTree!.tokens.getTokenBalanceChange(initializerTokenWallet);
     return expect(diff).to.be.equal(toNano(10));
  });
});
