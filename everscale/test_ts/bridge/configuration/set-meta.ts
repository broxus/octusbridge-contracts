const {
  setupRelays,
  setupBridge,
  setupEthereumEverscaleEventConfiguration,
  setupSolanaEverscaleEventConfiguration,
  setupEverscaleEthereumEventConfiguration,
  setupEverscaleSolanaEventConfiguration,
} = require("../../utils");

import { expect } from "chai";
import { Contract } from "locklift";
import { FactorySource } from "../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";

let bridge: Contract<FactorySource["Bridge"]>;
let cellEncoder: Contract<FactorySource["CellEncoderStandalone"]>;
let staking: Contract<FactorySource["StakingMockup"]>;
let bridgeOwner: Account;

describe("Test setting configuration meta", async function () {
  this.timeout(10000000);

  const emptyCell = "te6ccgEBAQEAAgAAAA==";

  it("Setup bridge", async () => {
    const relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  });

  describe("Ethereum Everscale event configuration", async () => {
    let ethereumEverscaleEventConfiguration: Contract<
      FactorySource["EthereumEverscaleEventConfiguration"]
    >;
    let proxy;

    it("Setup Ethereum Everscale event configuration", async () => {
      [ethereumEverscaleEventConfiguration, proxy] =
        await setupEthereumEverscaleEventConfiguration(
          bridgeOwner,
          bridge,
          cellEncoder
        );
    });

    it("Set Ethereum Everscale meta", async () => {
      await ethereumEverscaleEventConfiguration.methods
        .setMeta({
          _meta: "",
        })
        .send({
          from: bridgeOwner.address,
          amount: locklift.utils.toNano(1),
        });
    });

    it("Check Ethereum Everscale configuration meta", async () => {
      const details = await ethereumEverscaleEventConfiguration.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._meta.toString()).to.be.equal(emptyCell, "Wrong meta");
    });
  });

  describe("Everscale Ethereum event configuration", async () => {
    let everscaleEthereumEventConfiguration: Contract<
      FactorySource["EverscaleEthereumEventConfiguration"]
    >;

    it("Setup event configuration", async () => {
      [everscaleEthereumEventConfiguration] =
        await setupEverscaleEthereumEventConfiguration(
          bridgeOwner,
          bridge,
          cellEncoder
        );
    });

    it("Set Everscale Ethereum meta", async () => {
      await everscaleEthereumEventConfiguration.methods
        .setMeta({
          _meta: "",
        })
        .send({
          from: bridgeOwner.address,
          amount: locklift.utils.toNano(1),
        });
    });

    it("Check Everscale Ethereum configuration meta", async () => {
      const details = await everscaleEthereumEventConfiguration.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._meta.toString()).to.be.equal(emptyCell, "Wrong meta");
    });
  });

  describe("Solana Everscale event configuration", async () => {
    let solanaEverscaleEventConfiguration: Contract<
      FactorySource["SolanaEverscaleEventConfiguration"]
    >;
    let proxy;

    it("Setup Solana Everscale event configuration", async () => {
      [solanaEverscaleEventConfiguration, proxy] =
        await setupSolanaEverscaleEventConfiguration(bridgeOwner, bridge);
    });

    it("Set Solana Everscale meta", async () => {
      await solanaEverscaleEventConfiguration.methods
        .setMeta({
          _meta: "",
        })
        .send({
          from: bridgeOwner.address,
          amount: locklift.utils.toNano(1),
        });
    });

    it("Check Solana Everscale configuration meta", async () => {
      const details = await solanaEverscaleEventConfiguration.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._meta.toString()).to.be.equal(emptyCell, "Wrong meta");
    });
  });

  describe("Everscale Solana event configuration", async () => {
    let everscaleSolanaEventConfiguration: Contract<
      FactorySource["EverscaleSolanaEventConfiguration"]
    >;

    it("Setup Everscale Solana event configuration", async () => {
      [everscaleSolanaEventConfiguration] =
        await setupEverscaleSolanaEventConfiguration(bridgeOwner, bridge);
    });

    it("Set Everscale Solana meta", async () => {
      await everscaleSolanaEventConfiguration.methods
        .setMeta({
          _meta: "",
        })
        .send({
          from: bridgeOwner.address,
          amount: locklift.utils.toNano(1),
        });
    });

    it("Check Everscale Solana configuration meta", async () => {
      const details = await everscaleSolanaEventConfiguration.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._meta.toString()).to.be.equal(emptyCell, "Wrong meta");
    });
  });
});
