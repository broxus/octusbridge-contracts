import { Ed25519KeyPair } from "nekoton-wasm";

import { Contract } from "locklift";
import {
  BridgeAbi,
  CellEncoderStandaloneAbi,
  EthereumEverscaleEventConfigurationAbi,
  EverscaleEthereumEventConfigurationAbi,
  EverscaleSolanaEventConfigurationAbi,
  SolanaEverscaleEventConfigurationAbi,
  FactorySource,
  ProxyMultiVaultAlien_V10Abi,
  StakingMockupAbi,
} from "../../../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";
import { expect } from "chai";
import { setupBridge, setupRelays } from "../../../../utils/bridge";
import { deployAccount } from "../../../../utils/account";
import { logContract } from "../../../../utils/logger";
import { setupAlienMultiVault } from "../../../../utils/multivault/alien";

const logger = require("mocha-logger");

let relays: Ed25519KeyPair[];
let bridge: Contract<BridgeAbi>;
let cellEncoder: Contract<CellEncoderStandaloneAbi>;
let staking: Contract<StakingMockupAbi>;
let bridgeOwner: Account;

let ethereumEverscaleEventConfiguration: Contract<EthereumEverscaleEventConfigurationAbi>;
let everscaleEthereumEventConfiguration: Contract<EverscaleEthereumEventConfigurationAbi>;
let solanaEverscaleEventConfiguration: Contract<SolanaEverscaleEventConfigurationAbi>;
let everscaleSolanaEventConfiguration: Contract<EverscaleSolanaEventConfigurationAbi>;
let initializer: Account;
let proxy: Contract<ProxyMultiVaultAlien_V10Abi>;

describe("Test event contract behaviour when Alien token is incorrect", async function () {
  this.timeout(10000000);

  const executeAccounts = [
    {
      account: 123,
      readOnly: false,
      isSigner: true,
    },
  ];

  it("Setup bridge", async () => {
    relays = await setupRelays();
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

    const signer = (await locklift.keystore.getSigner("0"))!;

    initializer = await deployAccount(signer, 50);

    await logContract("Initializer", initializer.address);

    [
      ethereumEverscaleEventConfiguration,
      everscaleEthereumEventConfiguration,
      solanaEverscaleEventConfiguration,
      everscaleSolanaEventConfiguration,
      proxy,
    ] = await setupAlienMultiVault(bridgeOwner, staking);
  });

  describe("Call proxy burn callback from arbitrary account", async () => {
    const recipient = 888;
    const amount = 100;

    let eventContract: Contract<FactorySource["MultiVaultEverscaleSolanaEventAlien"]>;

    it("Call burn callback on proxy", async () => {
      const burnPayload = await cellEncoder.methods
        .encodeAlienBurnPayloadSolana({
          recipient,
          executeAccounts,
          executePayloadNeeded: false,
          executePayloadAccounts: executeAccounts,
          payload: "",
        })
        .call();

      const tx = await proxy.methods
        .onAcceptTokensBurn({
          amount,
          sender: initializer.address,
          value2: initializer.address,
          remainingGasTo: initializer.address,
          payload: burnPayload.value0,
        })
        .send({
          from: initializer.address,
          amount: locklift.utils.toNano(10),
        });

      logger.log(`Burn tx: ${tx.id.hash}`);

      const events = await everscaleSolanaEventConfiguration
        .getPastEvents({ filter: "NewEventContract" })
        .then(e => e.events);

      expect(events).to.have.lengthOf(1, "Everscale event configuration failed to deploy event");

      const [
        {
          data: { eventContract: expectedEventContract },
        },
      ] = events;

      logger.log(`Expected event address: ${expectedEventContract}`);

      eventContract = locklift.factory.getDeployedContract(
        "MultiVaultEverscaleSolanaEventAlien",
        expectedEventContract,
      );
    });

    it("Check event contract rejected and relays are loaded", async () => {
      const details = await eventContract.methods.getDetails({ answerId: 0 }).call({ responsible: true });

      expect(details._status).to.be.equal("0", "Event contract should be Rejected");
      expect(details._requiredVotes).to.be.not.equal(0, "Event contract failed to load relays");
    });
  });
});
