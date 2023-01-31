const { setupRelays, setupBridge, logContract } = require("../../utils");

import { expect } from "chai";
import { Contract } from "locklift";
import { FactorySource } from "../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";
const { zeroAddress } = require("locklift");

let bridge: Contract<FactorySource["Bridge"]>;
let cellEncoder: Contract<FactorySource["CellEncoderStandalone"]>;
let staking: Contract<FactorySource["StakingMockup"]>;
let bridgeOwner: Account;

describe("Test configuration factory", async function () {
  this.timeout(10000000);

  it("Setup bridge", async () => {
    const relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  });

  describe("Test Ethereum event configuration", async () => {
    let factory: Contract<
      FactorySource["EthereumEverscaleEventConfigurationFactory"]
    >;

    it("Setup Ethereum event configuration factory", async () => {
      const signer = (await locklift.keystore.getSigner("0"))!;
      const Configuration = await locklift.factory.getContractArtifacts(
        "EthereumEverscaleEventConfiguration"
      );

      const _randomNonce = locklift.utils.getRandomNonce();

      const { contract: factory_ } = await locklift.factory.deployContract({
        contract: "EthereumEverscaleEventConfigurationFactory",
        constructorParams: {
          _configurationCode: Configuration.code,
        },
        initParams: {
          _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1),
      });

      await logContract("factory address", factory_.address);

      factory = factory_;
    });

    let configuration: Contract<
      FactorySource["EthereumEverscaleEventConfiguration"]
    >;

    it("Deploy configuration", async () => {
      const EthereumEvent = await locklift.factory.getContractArtifacts(
        "TokenTransferEthereumEverscaleEvent"
      );

      const basicConfiguration = {
        eventABI: "",
        eventInitialBalance: locklift.utils.toNano("2"),
        staking: staking.address,
        eventCode: EthereumEvent.code,
      };

      const networkConfiguration = {
        chainId: 12,
        eventEmitter: 0,
        eventBlocksToConfirm: 1,
        proxy: zeroAddress,
        startBlockNumber: 0,
        endBlockNumber: 0,
      };

      await factory.methods
        .deploy({
          _owner: bridgeOwner.address,
          basicConfiguration,
          networkConfiguration,
        })
        .send({
          from: bridgeOwner.address,
          amount: locklift.utils.toNano(2),
        });

      let ethereumEverscaleEventConfigurationAddress = await factory.methods
        .deriveConfigurationAddress({
          basicConfiguration,
          networkConfiguration,
        })
        .call();

      configuration = locklift.factory.getDeployedContract(
        "EthereumEverscaleEventConfiguration",
        ethereumEverscaleEventConfigurationAddress.value0
      );

      await logContract("configuration address", configuration.address);
    });

    it("Check configuration", async () => {
      const details = await configuration.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._basicConfiguration.staking.toString()).to.be.equal(
        staking.address.toString(),
        "Wrong staking"
      );
      expect(details._networkConfiguration.chainId.toString()).to.be.equal(
        "12",
        "Wrong chain ID"
      );
    });
  });

  describe("Test Solana Ever event configuration", async () => {
    let factory: Contract<
      FactorySource["SolanaEverscaleEventConfigurationFactory"]
    >;

    it("Setup Solana Ever event configuration factory", async () => {
      const signer = (await locklift.keystore.getSigner("0"))!;
      const Configuration = await locklift.factory.getContractArtifacts(
        "SolanaEverscaleEventConfiguration"
      );

      const _randomNonce = locklift.utils.getRandomNonce();

      const { contract: factory_ } = await locklift.factory.deployContract({
        contract: "SolanaEverscaleEventConfigurationFactory",
        constructorParams: {
          _configurationCode: Configuration.code,
        },
        initParams: {
          _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1),
      });

      await logContract("factory address", factory_.address);

      factory = factory_;
    });

    let configuration: Contract<
      FactorySource["SolanaEverscaleEventConfiguration"]
    >;

    it("Deploy configuration", async () => {
      const SolanaEvent = await locklift.factory.getContractArtifacts(
        "TokenTransferSolanaEverscaleEvent"
      );

      const basicConfiguration = {
        eventABI: "",
        eventInitialBalance: locklift.utils.toNano(2),
        staking: staking.address,
        eventCode: SolanaEvent.code,
      };

      const networkConfiguration = {
        program: 0,
        // settings: 0,
        proxy: zeroAddress,
        startTimestamp: 0,
        endTimestamp: 0,
      };

      await factory.methods
        .deploy({
          _owner: bridgeOwner.address,
          basicConfiguration,
          networkConfiguration,
        })
        .send({
          from: bridgeOwner.address,
          amount: locklift.utils.toNano(2),
        });

      let solanaEverscaleEventConfigurationAddress = await factory.methods
        .deriveConfigurationAddress({
          basicConfiguration,
          networkConfiguration,
        })
        .call();

      configuration = locklift.factory.getDeployedContract(
        "SolanaEverscaleEventConfiguration",
        solanaEverscaleEventConfigurationAddress.value0
      );

      await logContract("configuration address", configuration.address);
    });

    it("Check configuration", async () => {
      const details = await configuration.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._basicConfiguration.staking.toString()).to.be.equal(
        staking.address.toString(),
        "Wrong staking"
      );
    });
  });

  describe("Test Ever Solana event configuration", async () => {
    let factory: Contract<
      FactorySource["EverscaleSolanaEventConfigurationFactory"]
    >;

    it("Setup Ever Solana event configuration factory", async () => {
      const signer = (await locklift.keystore.getSigner("0"))!;
      const Configuration = await locklift.factory.getContractArtifacts(
        "EverscaleSolanaEventConfiguration"
      );

      const _randomNonce = locklift.utils.getRandomNonce();

      const { contract: factory_ } = await locklift.factory.deployContract({
        contract: "EverscaleSolanaEventConfigurationFactory",
        constructorParams: {
          _configurationCode: Configuration.code,
        },
        initParams: {
          _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1),
      });

      await logContract("factory address", factory_.address);

      factory = factory_;
    });

    let configuration: Contract<
      FactorySource["EverscaleSolanaEventConfiguration"]
    >;

    it("Deploy configuration", async () => {
      const EverEvent = await locklift.factory.getContractArtifacts(
        "TokenTransferEverscaleSolanaEvent"
      );

      const basicConfiguration = {
        eventABI: "",
        eventInitialBalance: locklift.utils.toNano(2),
        staking: staking.address,
        eventCode: EverEvent.code,
      };

      const networkConfiguration = {
        program: 0,
        // settings: 0,
        eventEmitter: zeroAddress,
        instruction: 0,
        executeInstruction: 0,
        executeNeeded: false,
        startTimestamp: 0,
        endTimestamp: 0,
      };

      await factory.methods
        .deploy({
          _owner: bridgeOwner.address,
          basicConfiguration,
          networkConfiguration,
        })
        .send({
          from: bridgeOwner.address,
          amount: locklift.utils.toNano(2),
        });

      let everscaleSolanaEventConfigurationAddress = await factory.methods
        .deriveConfigurationAddress({
          basicConfiguration,
          networkConfiguration,
        })
        .call();

      configuration = locklift.factory.getDeployedContract(
        "EverscaleSolanaEventConfiguration",
        everscaleSolanaEventConfigurationAddress.value0
      );

      await logContract("configuration address", configuration.address);
    });

    it("Check configuration", async () => {
      const details = await configuration.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._basicConfiguration.staking.toString()).to.be.equal(
        staking.address.toString(),
        "Wrong staking"
      );
    });
  });
});
