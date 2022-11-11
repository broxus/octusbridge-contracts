import { Ed25519KeyPair } from "nekoton-wasm";

const {
  logger,
  setupRelays,
  setupBridge,
  setupSolanaAlienMultiVault,
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

describe("Test Solana event contract behaviour when Alien token is incorrect", async function () {
  this.timeout(10000000);

  it("Setup bridge", async () => {
    relays = await setupRelays();
    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

    [solanaConfiguration, everscaleConfiguration, proxy, initializer] =
      await setupSolanaAlienMultiVault(bridgeOwner, staking, cellEncoder);
  });

  describe("Call proxy burn callback from arbitrary account", async () => {
    const recipient = 888;
    const amount = 100;

    let eventContract: Contract<
      FactorySource["MultiVaultEverscaleSolanaEventAlien"]
    >;

    it("Call burn callback on proxy", async () => {
      const burnPayload = await cellEncoder.methods
        .encodeAlienBurnPayloadSolana({
          recipient,
        })
        .call();

      const tx = await proxy.methods
        .onAcceptTokensBurn({
          amount,
          value1: initializer.address,
          value2: initializer.address,
          remainingGasTo: initializer.address,
          payload: burnPayload.value0,
        })
        .send({
          from: initializer.address,
          amount: locklift.utils.toNano(10),
        });

      logger.log(`Burn tx: ${tx.id}`);

      const events = await everscaleConfiguration
        .getPastEvents({ filter: "NewEventContract" })
        .then((e) => e.events);

      expect(events).to.have.lengthOf(
        1,
        "Everscale event configuration failed to deploy event"
      );

      const [
        {
          data: { eventContract: expectedEventContract },
        },
      ] = events;

      logger.log(`Expected event address: ${expectedEventContract}`);

      eventContract = await locklift.factory.getDeployedContract(
        "MultiVaultEverscaleSolanaEventAlien",
        expectedEventContract
      );
    });

    it("Check event contract rejected and relays are loaded", async () => {
      const details = await eventContract.methods
        .getDetails({ answerId: 0 })
        .call();

      expect(details._status).to.be.equal(
        3,
        "Event contract should be Rejected"
      );
      expect(details._requiredVotes).to.be.not.equal(
        0,
        "Event contract failed to load relays"
      );
    });
  });
});
