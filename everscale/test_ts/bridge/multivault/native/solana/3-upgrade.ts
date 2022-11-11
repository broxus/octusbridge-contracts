import { Ed25519KeyPair } from "nekoton-wasm";

const {
  setupRelays,
  setupBridge,
  setupSolanaNativeMultiVault,
  logger,
} = require("../../../../utils");

import { expect } from "chai";
import { Contract } from "locklift";
import { FactorySource } from "../../../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";

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
let proxy: Contract<FactorySource["ProxyMultiVaultSolanaNative"]>;
let initializer: Account;

describe("Test Solana Native proxy upgrade", async function () {
  this.timeout(10000000);

  it("Setup bridge", async () => {
    relays = await setupRelays();
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

    [solanaConfiguration, everscaleConfiguration, proxy, initializer] =
      await setupSolanaNativeMultiVault(bridgeOwner, staking);
  });

  it("Check initial api version", async () => {
    expect(await proxy.methods.apiVersion({ answerId: 0 }).call()).to.be.equal(
      1,
      "Wrong api version"
    );
  });

  it("Upgrade proxy to itself and check storage", async () => {
    const _configuration = await proxy.methods
      .getConfiguration({ answerId: 0 })
      .call()
      .then((c) => c.value0);

    const Proxy = await locklift.factory.getContractArtifacts(
      "ProxyMultiVaultSolanaNative"
    );

    const tx = await proxy.methods
      .upgrade({
        code: Proxy.code,
      })
      .send({
        from: bridgeOwner.address,
        amount: locklift.utils.toNano(10),
      });

    logger.log(`Upgrade tx: ${tx.id}`);

    const configuration = await proxy.methods
      .getConfiguration({ answerId: 0 })
      .call()
      .then((c) => c.value0);

    expect(configuration.everscaleConfiguration).to.be.equal(
      _configuration.everscaleConfiguration,
      "Wrong everscale configuration"
    );
    expect(configuration.solanaConfiguration).to.be.eql(
      _configuration.solanaConfiguration,
      "Wrong solana configuration"
    );
    expect(configuration.deployWalletValue).to.be.equal(
      _configuration.deployWalletValue,
      "Wrong deploy wallet value"
    );
  });

  it("Check api version after upgrade", async () => {
    expect(await proxy.methods.apiVersion({ answerId: 0 }).call()).to.be.equal(
      2,
      "Wrong api version"
    );
  });
});
