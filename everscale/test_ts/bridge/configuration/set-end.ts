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

describe("Test setting configuration end", async function () {
  this.timeout(10000000);

  it("Setup bridge", async () => {
    const relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  });

  describe("Ethereum Everscale event configuration", async () => {
    let ethereumEverscaleEventConfiguration: Contract<
      FactorySource["EthereumEverscaleEventConfiguration"]
    >;

    let proxy: Contract<FactorySource["ProxyTokenTransfer"]>;

    it("Setup Ethereum Everscale event configuration", async () => {
      [ethereumEverscaleEventConfiguration, proxy] =
        await setupEthereumEverscaleEventConfiguration(
          bridgeOwner,
          bridge,
          cellEncoder
        );
    });

    it("Set Ethereum Everscale end block", async () => {
      await ethereumEverscaleEventConfiguration.methods
        .setEndBlockNumber({
          endBlockNumber: 1,
        })
        .send({
          from: bridgeOwner.address,
          amount: locklift.utils.toNano(1),
        });
    });

    it("Check Ethereum Everscale configuration end block", async () => {
      expect(
        await bridge.methods
          .active()
          .call()
          .then((t) => t.active)
      ).to.be.equal(true, "Wrong active status");

      const details = await ethereumEverscaleEventConfiguration.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._networkConfiguration.endBlockNumber).to.be.equal(
        "1",
        "Wrong end block number"
      );
    });

    it("Try to deploy event after end block", async () => {});
  });

  describe("Everscale Ethereum event configuration", async () => {
    let everscaleEthereumEventConfiguration: Contract<
      FactorySource["EverscaleEthereumEventConfiguration"]
    >;

    it("Setup Everscale Ethereum event configuration", async () => {
      [everscaleEthereumEventConfiguration] =
        await setupEverscaleEthereumEventConfiguration(
          bridgeOwner,
          bridge,
          cellEncoder
        );
    });

    it("Set Everscale Ethereum end timestamp", async () => {
      await everscaleEthereumEventConfiguration.methods
        .setEndTimestamp({
          endTimestamp: 1,
        })
        .send({
          from: bridgeOwner.address,
          amount: locklift.utils.toNano(1),
        });
    });

    it("Check Everscale Ethereum configuration end timestamp", async () => {
      const details = await everscaleEthereumEventConfiguration.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._networkConfiguration.endTimestamp).to.be.equal(
        "1",
        "Wrong end timestamps"
      );
    });

    it("Try to deploy event after end timestamp", async () => {});
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

    it("Set Solana Everscale end timestamp", async () => {
      await solanaEverscaleEventConfiguration.methods
        .setEndTimestamp({
          endTimestamp: 1,
        })
        .send({
          from: bridgeOwner.address,
          amount: locklift.utils.toNano(1),
        });
    });

    it("Check Solana Everscale configuration end block", async () => {
      const details = await solanaEverscaleEventConfiguration.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._networkConfiguration.endTimestamp).to.be.equal(
        "1",
        "Wrong end timestamp"
      );
    });

    it("Try to deploy event after end block", async () => {});
  });

  describe("Everscale Solana event configuration", async () => {
    let everscaleSolanaEventConfiguration: Contract<
      FactorySource["EverscaleSolanaEventConfiguration"]
    >;

    it("Setup Everscale Solana event configuration", async () => {
      [everscaleSolanaEventConfiguration] =
        await setupEverscaleSolanaEventConfiguration(bridgeOwner, bridge);
    });

    it("Set Everscale Solana end timestamp", async () => {
      await everscaleSolanaEventConfiguration.methods
        .setEndTimestamp({
          endTimestamp: 1,
        })
        .send({
          from: bridgeOwner.address,
          amount: locklift.utils.toNano(1),
        });
    });

    it("Check Everscale Solana configuration end timestamp", async () => {
      const details = await everscaleSolanaEventConfiguration.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._networkConfiguration.endTimestamp).to.be.equal(
        "1",
        "Wrong end timestamps"
      );
    });

    it("Try to deploy event after end timestamp", async () => {});
  });
});
