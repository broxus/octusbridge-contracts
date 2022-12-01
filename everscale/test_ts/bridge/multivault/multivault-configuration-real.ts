import { Ed25519KeyPair } from "nekoton-wasm";

const {
  enableEventConfiguration,
  setupBridge,
  captureConnectors,
  setupSolanaAlienMultiVaultReal,
  setupSolanaNativeMultiVaultReal,
  MetricManager,
  logger,
} = require("../../utils");

import { expect } from "chai";
import { Contract } from "locklift";
import {
  FactorySource,
} from "../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";

let bridge: Contract<FactorySource["Bridge"]>;
let cellEncoder: Contract<FactorySource["CellEncoderStandalone"]>;
let staking: Contract<FactorySource["StakingMockup"]>;
let bridgeOwner: Account;
let metricManager: InstanceType<typeof MetricManager>;
let relays: Ed25519KeyPair[];
let solanaConfigurationAlien: Contract<
  FactorySource["SolanaEverscaleEventConfiguration"]
>;
let solanaConfigurationNative: Contract<
  FactorySource["SolanaEverscaleEventConfiguration"]
>;
let everscaleConfigurationAlien: Contract<
  FactorySource["EverscaleSolanaEventConfiguration"]
>;
let everscaleConfigurationNative: Contract<
  FactorySource["EverscaleSolanaEventConfiguration"]
>;
let proxy: Contract<FactorySource["ProxyMultiVaultSolanaAlien"]>;

describe("Test Solana multivault pipeline", async function () {
  this.timeout(10000000);

  afterEach(async function () {
    const lastCheckPoint = metricManager.lastCheckPointName();
    const currentName = this.currentTest?.title;

    await metricManager.checkPoint(currentName);

    if (lastCheckPoint === undefined) return;

    const difference = await metricManager.getDifference(
      lastCheckPoint,
      currentName
    );

    for (const [contract, balanceDiff] of Object.entries(difference)) {
      if (balanceDiff !== 0) {
        logger.log(
          `[Balance change] ${contract} ${locklift.utils.fromNano(
            balanceDiff as number
          )} EVER`
        );
      }
    }
  });

  it("Setup bridge", async () => {
    relays = [
      {
        publicKey:
          "65cd61c865b5f1a459a14a66bd11d878d349df1d3b1d85945590addb02acddf4",
        secretKey:
          "65cd61c865b5f1a459a14a66bd11d878d349df1d3b1d85945590addb02acddf4",
      },
    ];

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

    [solanaConfigurationAlien, everscaleConfigurationAlien, proxy] =
      await setupSolanaAlienMultiVaultReal(bridgeOwner, staking, cellEncoder);

    [solanaConfigurationNative, everscaleConfigurationNative, proxy] =
      await setupSolanaNativeMultiVaultReal(bridgeOwner, staking, cellEncoder);

    metricManager = new MetricManager(
      bridge,
      bridgeOwner,
      staking,
      solanaConfigurationAlien,
      everscaleConfigurationAlien,
      solanaConfigurationNative,
      everscaleConfigurationNative,
      proxy
    );
  });

  describe("Enable alien events configuration", async () => {
    it("Add sol event alien configuration to bridge", async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        solanaConfigurationAlien.address
      );
    });

    it("Check sol alien configuration enabled", async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations["0"]).to.be.not.equal(
        undefined,
        "Configuration not found"
      );

      expect(configurations["0"]._eventConfiguration.toString()).to.be.equal(
        solanaConfigurationAlien.address.toString(),
        "Wrong configuration address"
      );

      expect(configurations["0"]._enabled).to.be.equal(
        true,
        "Wrong connector status"
      );
    });
    it("Add ever event alien configuration to bridge", async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        everscaleConfigurationAlien.address
      );
    });

    it("Check ever alien configuration enabled", async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations["1"]).to.be.not.equal(
        undefined,
        "Configuration not found"
      );

      expect(configurations["1"]._eventConfiguration.toString()).to.be.equal(
        everscaleConfigurationAlien.address.toString(),
        "Wrong configuration address"
      );

      expect(configurations["1"]._enabled).to.be.equal(
        true,
        "Wrong connector status"
      );
    });
  });

  describe("Enable native events configuration", async () => {
    it("Add sol event native configuration to bridge", async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        solanaConfigurationNative.address
      );
    });

    it("Check sol native configuration enabled", async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations["2"]).to.be.not.equal(
        undefined,
        "Configuration not found"
      );

      expect(configurations["2"]._eventConfiguration.toString()).to.be.equal(
        solanaConfigurationNative.address.toString(),
        "Wrong configuration address"
      );

      expect(configurations["2"]._enabled).to.be.equal(
        true,
        "Wrong connector status"
      );
    });
    it("Add ever event native configuration to bridge", async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        everscaleConfigurationNative.address
      );
    });

    it("Check ever native configuration enabled", async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations["3"]).to.be.not.equal(
        undefined,
        "Configuration not found"
      );

      expect(configurations["3"]._eventConfiguration.toString()).to.be.equal(
        everscaleConfigurationNative.address.toString(),
        "Wrong configuration address"
      );

      expect(configurations["3"]._enabled).to.be.equal(
        true,
        "Wrong connector status"
      );
    });
  });
});
