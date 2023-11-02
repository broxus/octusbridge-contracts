
import { expect } from "chai";
import { Contract } from "locklift";
import {BridgeAbi} from "../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";
import {setupBridge, setupRelays} from "../../utils/bridge";
import { deployAccount } from "../../utils/account";
const { zeroAddress } = require("locklift");

let bridge: Contract<BridgeAbi>;
let bridgeOwner: Account;

describe("Test bridge update", async function () {
  this.timeout(10000000);

  let staking, cellEncoder;

  it("Deploy bridge", async () => {
    const relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  });

  it("Update active flag", async () => {
    await bridge.methods
      .updateActive({
        _active: false,
      })
      .send({
        from: bridgeOwner.address,
        amount: locklift.utils.toNano(1),
      });

    expect(await bridge.methods.active().call().then(t => t.active)).to.be.equal(
      false,
      "Wrong active status"
    );
  });

  it("Update connector deploy value", async () => {
    await bridge.methods
      .updateConnectorDeployValue({
        _connectorDeployValue: 1,
      })
      .send({
        from: bridgeOwner.address,
        amount: locklift.utils.toNano(1),
      });

    expect(await bridge.methods.connectorDeployValue().call().then(t=> t.connectorDeployValue)).to.be.equal(
      "1",
      "Wrong connector deploy value"
    );
  });

  it("Update manager address", async () => {
    expect(await bridge.methods.manager().call().then(t => t.manager.toString())).to.be.equal(
      bridgeOwner.address.toString(),
      "Wrong manager address"
    );

    const signer = (await locklift.keystore.getSigner("0"))!;
    const new_manager = await deployAccount(signer, 5);

    await bridge.methods
      .setManager({
        _manager: new_manager.address,
      })
      .send({
        from: bridgeOwner.address,
        amount: locklift.utils.toNano(1),
      });

    expect(await bridge.methods.manager().call().then(t => t.manager.toString())).to.be.equal(
      new_manager.address.toString(),
      "Wrong manager address"
    );
  });
});
