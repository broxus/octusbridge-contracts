import { Contract, toNano } from "locklift";
import { Account } from "everscale-standalone-client/nodejs";
import { expect } from "chai";

import {
  CellEncoderStandaloneAbi,
  ProxyMultiVaultNative_V7Abi,
  StakingMockupAbi,
  TokenRootAbi,
  TokenWalletAbi,
  TrustlessVerifierMockupAbi,
  TvmTvmEventConfigurationAbi,
} from "../../../../../build/factorySource";

import { setupBridge } from "../../../../utils/bridge";
import { setupNativeMultiVault } from "../../../../utils/multivault/native";
import { deployTokenRoot, mintTokens } from "../../../../utils/token";

const PSEUDO_BLOCK_PROOF = "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";
const TX_PROOF = "te6ccgECEgEAAokACUYD/r3LGNwe967ekWFcTh50iB8tkpGioywL45e/tG7Xi28ACgEjt3mn6e78OUqF9jE3hdtB6TELUCKFjh9GsBi/qUahv2Vq0AAAAAAAAA3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANxn/SGmAAVIBlu8gIBAMCKEgBARq/khfOXMs/nGtW/BQpCgwUsCQxIcEYRiCYgm3hTrNRAAEoSAEB/vP/fGmbXgDIHnPHbCIVG54XMuH9cCFAxQy1nddiUJgAACIB4BEFIgHdBwYoSAEBDbqb0GUX5TWgY4Np1ulgSf+dOIJRROMAx4szN9W2GgsAAQEBIAgBXeAE0/T3fhylQvsYm8LtoPSYhagRQscPo1gMX9SjUN+ytWgAAAAAAAABvs/6Q0zACQNVHW6jGv//6I+ABD2X/63dltLlFAx1syah3bhUrNnXq9kV/tBZIoJgGIPhMBAPCgFDgBfx0r8jsjJuBj/7IOQfosG/nEMCgALyXIISFDihm9V60AsBQ4AG6xJxJ3HnggHoP188HlhCSleIUWcnb9DEFCoYKIA+zPAMAaOABusScSdx54IB6D9fPB5YQkpXiFFnJ2/QxBQqGCiAPszgAAAAAAAAAAAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEoKejEQDQFjAAAAAAAAAAAAAAAAAAAAAIAG6xJxJ3HnggHoP188HlhCSleIUWcnb9DEFCoYKIA+zPgOAAAAIENVU1RPTV9HSUdBX0NIQUQAIEN1c3RvbSBHaWdhIENoYWQoSAEB3AEtaKdl37NMFY1ZFLa/FO1xS0K6EFM9R4JVdXXRnGQABg==";
const EVENT_MSG_HASH = "0x6729eaac7db55983eebcf359e959a2bb8cf7db297f06f220dcc76ff344bf5774";

const tokenMeta = {
  name: "Custom Giga Chad",
  symbol: "CUSTOM_GIGA_CHAD",
  decimals: 9,
};

const mintAmount = 1000;
const amount = 500;

describe("Deposit and withdraw native TVM token with no merging", () => {
  let bridgeOwner: Account;

  let staking: Contract<StakingMockupAbi>;
  let trustlessVerifier: Contract<TrustlessVerifierMockupAbi>;
  let nativeTvmTvmEventConfiguration: Contract<TvmTvmEventConfigurationAbi>;
  let cellEncoder: Contract<CellEncoderStandaloneAbi>;
  let initializerTokenWallet: Contract<TokenWalletAbi>;
  let nativeProxy: Contract<ProxyMultiVaultNative_V7Abi>;
  let tokenRoot: Contract<TokenRootAbi>;

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
        amount: "500",
        recipient: bridgeOwner.address,
        expectedGas: "0",
        remainingGasTo: bridgeOwner.address,
        sender: bridgeOwner.address,
      });
  });

  it.skip("Process TVM-TVM native deposit event", async () => {
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
});
