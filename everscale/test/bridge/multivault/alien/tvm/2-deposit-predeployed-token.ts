import { Address, Contract, toNano } from "locklift";
import { Account } from "everscale-standalone-client/nodejs";
import { expect } from "chai";

import {
  ProxyMultiVaultAlien_V9Abi,
  ProxyMultiVaultNative_V7Abi,
  StakingMockupAbi,
  TrustlessVerifierMockupAbi,
  TvmTvmEventConfigurationAbi,
  TokenRootAbi,
} from "../../../../../build/factorySource";

import { setupBridge } from "../../../../utils/bridge";
import { setupAlienMultiVault } from "../../../../utils/multivault/alien";
import { setupNativeMultiVault } from "../../../../utils/multivault/native";
import { deployTokenRoot, mintTokens, getTokenWalletByAddress } from "../../../../utils/token";

const PSEUDO_BLOCK_PROOF = "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";
const TX_PROOF = "te6ccgECEgEAAokACUYDDxtfSxJPz6DLBSvMVXw7+ZPiQkvq9qd/HHxtTDH0PcsACgEjt31jBolklF0Pmyg/CBJz9xmvScN93di98KNozcW1ZTnZkAAAAAAAAAbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFBn/PnIAAVIAl4hQIBAMCKEgBAefZP4fOV5aN7qfywDpRMKMgDnRCs4tXZxLioMVxM4qfAAEoSAEBjYjzxla+GKU/ogcTkdTBbFiaH9XCDYuBG7bGWprSmUwAACIB4BEFIgHdBwYoSAEBGqoDNnp52bDRxRfFKWzOX2xAPVkLFAqZK/diPQzHxckAAQEBIAgBXeAGsYNEskouh82UH4QJOfuM16Thvu7sXvhRtGbi2rKc7MgAAAAAAAAA2s/585DACQNVTV98M///6I+ABD2X/63dltLlFAx1syah3bhUrNnXq9kV/tBZIoJgGIPhMBAPCgFDgBfx0r8jsjJuBj/7IOQfosG/nEMCgALyXIISFDihm9V60AsBQ4AG6xJxJ3HnggHoP188HlhCSleIUWcnb9DEFCoYKIA+zPAMAaOABusScSdx54IB6D9fPB5YQkpXiFFnJ2/QxBQqGCiAPszgAAAAAAAAAAAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEWbtq4QDQFjAAAAAAAAAAAAAAAAAAAAAIAG6xJxJ3HnggHoP188HlhCSleIUWcnb9DEFCoYKIA+zPgOAAAAIENVU1RPTV9HSUdBX0NIQUQAIEN1c3RvbSBHaWdhIENoYWQoSAEBe057WZOqMLLMwE2ZHjL+q/Q125UsGREdAlvsRwia6swABw==";
const EVENT_MSG_HASH = "0x1ddd58658317d10d04f67ae5f9157478242ab8710c360a5e24ab64ada2ce982a";

const tokenMeta = {
  name: "Custom Giga Chad",
  symbol: "CUSTOM_GIGA_CHAD",
  decimals: 9,
};

describe("Deposit alien TVM as predeployed native token", () => {
  let bridgeOwner: Account;

  let staking: Contract<StakingMockupAbi>;
  let trustlessVerifier: Contract<TrustlessVerifierMockupAbi>;
  let alienTvmTvmEventConfiguration: Contract<TvmTvmEventConfigurationAbi>;
  let alienProxy: Contract<ProxyMultiVaultAlien_V9Abi>;
  let nativeProxy: Contract<ProxyMultiVaultNative_V7Abi>;
  let tokenRoot: Contract<TokenRootAbi>;

  before("Setup bridge", async () => {
    [, bridgeOwner, staking, , trustlessVerifier] = await setupBridge([]);
    [, , , , alienProxy, alienTvmTvmEventConfiguration] = await setupAlienMultiVault(
      bridgeOwner,
      staking,
      trustlessVerifier,
    );
    [, , , , nativeProxy, ] = await setupNativeMultiVault(
      bridgeOwner,
      staking,
      trustlessVerifier,
    );
  });

  it("Deploy native token root", async () => {
    tokenRoot = await deployTokenRoot(
      tokenMeta.name,
      tokenMeta.symbol,
      tokenMeta.decimals,
      bridgeOwner.address,
    );
  });

  it("Mint native tokens to bridge owner", async () => {
    await mintTokens(bridgeOwner, [bridgeOwner], tokenRoot, 1000);
  });

  it("Transfer tokens to native proxy", async () => {
    await locklift.transactions.waitFinalized(
      getTokenWalletByAddress(bridgeOwner.address, tokenRoot.address)
        .then((w) => w.methods
          .transfer({
            amount: 1000,
            recipient: nativeProxy.address,
            deployWalletValue: toNano(0.1),
            remainingGasTo: bridgeOwner.address,
            notify: false,
            payload: '',
          })
          .send({ from: bridgeOwner.address, amount: toNano(2), bounce: true }),
        ),
    );
  });

  it("Set native proxy to alien", async () => {
    await locklift.transactions.waitFinalized(
      alienProxy.methods
        .setProxyMultiVaultNative({ _proxyMultiVaultNative: nativeProxy.address })
        .send({ from: bridgeOwner.address, amount: toNano(2), bounce: true }),
    );
  });

  it("Set alien proxy to native", async () => {
    await locklift.transactions.waitFinalized(
      nativeProxy.methods
        .setProxyMultiVaultAlien({ _proxyMultiVaultAlien: alienProxy.address })
        .send({ from: bridgeOwner.address, amount: toNano(2), bounce: true }),
    );
  });

  it("Add predeployed token", async () => {
    await locklift.transactions.waitFinalized(
      alienProxy.methods
        .addPredeployedTVMToken({
          _incomingExternal: new Address("0:21ecbffd6eecb69728a063ad99350eedc2a566cebd5ec8aff682c9141300c41f"),
          _tokenData: {
            internalToken: tokenRoot.address,
            externalNativeProxyWallet: new Address("0:bf8e95f91d91937031ffd90720fd160dfce21814001792e41090a1c50cdeabd6"),
          },
          _remainingGasTo: bridgeOwner.address,
        })
        .send({ from: bridgeOwner.address, amount: toNano(2), bounce: true }),
    );
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
        .send({ from: bridgeOwner.address, amount: toNano(18), bounce: true }),
      { allowedCodes: { compute: [51] } },
    );

    return expect(traceTree)
      .to.emit("NewEventContract")
      .count(1)
      .and.to.emit("Confirmed")
      .count(1)
      .and.to.call("onTVMEventConfirmedExtended", nativeProxy.address)
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
