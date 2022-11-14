import { Ed25519KeyPair } from "nekoton-wasm";

const {
  setupRelays,
  setupBridge,
  setupSolanaAlienMultiVault,
  logger,
} = require("../../../../utils");

import { Contract } from "locklift";
import { FactorySource } from "../../../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";
import { expect } from "chai";

let bridge: Contract<FactorySource["Bridge"]>;
let cellEncoder: Contract<FactorySource["CellEncoderStandalone"]>;
let staking: Contract<FactorySource["StakingMockup"]>;
let bridgeOwner: Account;
let relays: Ed25519KeyPair[];
let solanaConfiguration: Contract<
  FactorySource["SolanaEverscaleEventConfiguration"]
>;
let everscaleConfiguration: Contract<
  FactorySource["EverscaleSolanaEventConfiguration"]
>;
let proxy: Contract<FactorySource["ProxyMultiVaultSolanaAlien"]>;
let initializer: Account;

describe("Test Solana Alien proxy upgrade", async function () {
  this.timeout(10000000);

  it("Setup bridge", async () => {
    relays = await setupRelays();
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

    [solanaConfiguration, everscaleConfiguration, proxy, initializer] =
      await setupSolanaAlienMultiVault(bridgeOwner, staking, cellEncoder);
  });

  it("Check initial api version", async () => {
    expect(await proxy.methods.apiVersion({ answerId: 0 }).call().then(t => t.value0)).to.be.equal(
        "1",
        "Wrong api version"
    );
  });

  it("Upgrade proxy to itself and check storage", async () => {
    const _configuration = await proxy.methods
      .getConfiguration({ answerId: 0 })
      .call()
      .then((c) => c.value0);

    const Proxy = await locklift.factory.getContractArtifacts(
      "ProxyMultiVaultSolanaAlien"
    );

    const tx = await proxy.methods
      .upgrade({
        code: Proxy.code,
      })
      .send({
        from: bridgeOwner.address,
        amount: locklift.utils.toNano(10),
      });

    logger.log(`Upgrade tx: ${tx.id.hash}`);

    const configuration = await proxy.methods
      .getConfiguration({ answerId: 0 })
      .call()
      .then((c) => c.value0);

    expect(configuration.everscaleConfiguration.toString()).to.be.equal(
      _configuration.everscaleConfiguration.toString(),
      "Wrong everscale configuration"
    );
    expect(configuration.solanaConfiguration.toString()).to.be.eql(
      _configuration.solanaConfiguration.toString(),
      "Wrong solana configuration"
    );
    expect(configuration.deployWalletValue).to.be.equal(
      _configuration.deployWalletValue,
      "Wrong deploy wallet value"
    );

    expect(configuration.alienTokenRootCode).to.be.equal(
      _configuration.alienTokenRootCode,
      "Wrong alien token root code"
    );
    expect(configuration.alienTokenWalletCode).to.be.equal(
      _configuration.alienTokenWalletCode,
      "Wrong alien token wallet code"
    );
    expect(configuration.alienTokenWalletPlatformCode).to.be.equal(
      _configuration.alienTokenWalletPlatformCode,
      "Wrong alien token wallet platform code"
    );
  });

  it("Check api version after upgrade", async () => {
    expect(await proxy.methods.apiVersion({ answerId: 0 }).call().then(t => t.value0)).to.be.equal(
        "2",
        "Wrong api version"
    );
  });
});
