import { expect } from "chai";
import { Contract, zeroAddress } from "locklift";
import { BridgeAbi, CellEncoderStandaloneAbi, FactorySource, StakingMockupAbi } from "../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";
import { setupBridge, setupRelays } from "../../utils/bridge";
import {
  setupEthereumEverscaleEventConfiguration,
  setupEverscaleEthereumEventConfiguration,
} from "../../utils/event-configurations/evm";
import {
  setupEverscaleSolanaEventConfiguration,
  setupSolanaEverscaleEventConfiguration,
} from "../../utils/event-configurations/solana";
import { setupTVMEverscaleEventConfiguration } from "../../utils/event-configurations/tvm";

let bridge: Contract<BridgeAbi>;
let cellEncoder: Contract<CellEncoderStandaloneAbi>;
let staking: Contract<StakingMockupAbi>;
let bridgeOwner: Account;

describe("Test setting configuration end", async function () {
  this.timeout(10000000);

  const proxy = zeroAddress;
  const emptyCell = "te6ccgEBAQEAAgAAAA==";

  it("Setup bridge", async () => {
    const relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  });

  describe("Ethereum Everscale event configuration", async () => {
    let ethereumEverscaleEventConfiguration: Contract<FactorySource["EthereumEverscaleEventConfiguration"]>;

    it("Setup Ethereum Everscale event configuration", async () => {
      ethereumEverscaleEventConfiguration = await setupEthereumEverscaleEventConfiguration(
        bridgeOwner,
        staking,
        proxy,
        "",
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
          .then(t => t.active),
      ).to.be.equal(true, "Wrong active status");

      const details = await ethereumEverscaleEventConfiguration.methods
        .getDetails({ answerId: 0 })
        .call({ responsible: true });

      expect(details._networkConfiguration.endBlockNumber).to.be.equal("1", "Wrong end block number");
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
        .call({ responsible: true });

      expect(details._meta.toString()).to.be.equal(emptyCell, "Wrong meta");
    });
  });

  describe("Everscale Ethereum event configuration", async () => {
    let everscaleEthereumEventConfiguration: Contract<FactorySource["EverscaleEthereumEventConfiguration"]>;

    it("Setup Everscale Ethereum event configuration", async () => {
      everscaleEthereumEventConfiguration = await setupEverscaleEthereumEventConfiguration(
        bridgeOwner,
        staking,
        proxy,
        "",
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
        .call({ responsible: true });

      expect(details._networkConfiguration.endTimestamp).to.be.equal("1", "Wrong end timestamps");
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
        .call({ responsible: true });

      expect(details._meta.toString()).to.be.equal(emptyCell, "Wrong meta");
    });
  });

  describe("Solana Everscale event configuration", async () => {
    let solanaEverscaleEventConfiguration: Contract<FactorySource["SolanaEverscaleEventConfiguration"]>;

    it("Setup Solana Everscale event configuration", async () => {
      solanaEverscaleEventConfiguration = await setupSolanaEverscaleEventConfiguration(bridgeOwner, staking, proxy, "");
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
        .call({ responsible: true });

      expect(details._networkConfiguration.endTimestamp).to.be.equal("1", "Wrong end timestamp");
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
        .call({ responsible: true });

      expect(details._meta.toString()).to.be.equal(emptyCell, "Wrong meta");
    });
  });

  describe("Everscale Solana event configuration", async () => {
    let everscaleSolanaEventConfiguration: Contract<FactorySource["EverscaleSolanaEventConfiguration"]>;

    it("Setup Everscale Solana event configuration", async () => {
      everscaleSolanaEventConfiguration = await setupEverscaleSolanaEventConfiguration(bridgeOwner, staking, proxy, "");
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
        .call({ responsible: true });

      expect(details._networkConfiguration.endTimestamp).to.be.equal("1", "Wrong end timestamps");
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
        .call({ responsible: true });

      expect(details._meta.toString()).to.be.equal(emptyCell, "Wrong meta");
    });
  });

  describe("TVM Everscale event configuration", async () => {
    let tvmEverscaleEventConfiguration: Contract<FactorySource["TVMEverscaleEventConfiguration"]>;

    it("Setup TVM Everscale event configuration", async () => {
      tvmEverscaleEventConfiguration = await setupTVMEverscaleEventConfiguration(bridgeOwner, proxy, "", zeroAddress);
    });

    it("Set TVM Everscale end block", async () => {
      await tvmEverscaleEventConfiguration.methods
        .setEndBlockNumber({
          endBlockNumber: 1,
        })
        .send({
          from: bridgeOwner.address,
          amount: locklift.utils.toNano(1),
        });
    });

    it("Check TVM Everscale configuration end block", async () => {
      expect(
        await bridge.methods
          .active()
          .call()
          .then(t => t.active),
      ).to.be.equal(true, "Wrong active status");

      const details = await tvmEverscaleEventConfiguration.methods
        .getDetails({ answerId: 0 })
        .call({ responsible: true });

      expect(details._networkConfiguration.endBlockNumber).to.be.equal("1", "Wrong end block number");
    });

    it("Set TVM Everscale meta", async () => {
      await tvmEverscaleEventConfiguration.methods
        .setMeta({
          _meta: "",
        })
        .send({
          from: bridgeOwner.address,
          amount: locklift.utils.toNano(1),
        });
    });

    it("Check TVM Everscale configuration meta", async () => {
      const details = await tvmEverscaleEventConfiguration.methods
        .getDetails({ answerId: 0 })
        .call({ responsible: true });

      expect(details._meta.toString()).to.be.equal(emptyCell, "Wrong meta");
    });
  });
});
