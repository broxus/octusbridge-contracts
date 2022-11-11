import { Ed25519KeyPair } from "nekoton-wasm";

const {
  setupRelays,
  setupBridge,
  setupEthereumNativeMultiVault,
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
let evmConfiguration: Contract<
  FactorySource["EthereumEverscaleEventConfiguration"]
>;
let everscaleConfiguration: Contract<
  FactorySource["EverscaleEthereumEventConfiguration"]
>;
let proxy: Contract<FactorySource["ProxyMultiVaultEthereumNative"]>;
let initializer: Account;

describe("Test Ethereum Native proxy upgrade", async function () {
  this.timeout(10000000);

  it("Setup bridge", async () => {
    relays = await setupRelays();
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

    [evmConfiguration, everscaleConfiguration, proxy, initializer] =
      await setupEthereumNativeMultiVault(bridgeOwner, staking);
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
      "ProxyMultiVaultEthereumNative"
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
    expect(configuration.evmConfigurations).to.be.eql(
      _configuration.evmConfigurations,
      "Wrong evm configurations"
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
