const {
  setupBridge,
  setupRelays,
} = require('../../utils');

import { expect } from "chai";
import { Contract } from "locklift";
import { FactorySource } from "../../../build/factorySource";
import {Account} from "everscale-standalone-client/nodejs";
const {zeroAddress} = require("locklift");

let bridge: Contract<FactorySource["Bridge"]>;
let bridgeOwner: Account;

describe('Test bridge update', async function() {
  this.timeout(10000000);
  
  let staking, cellEncoder;
  
  it('Deploy bridge', async () => {
    const relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
  });
  
  it('Update active flag', async () => {

    await bridge.methods.updateActive({
      _active: false
    }).send({
      from: bridgeOwner.address,
      amount: locklift.utils.toNano(1),
    });

    expect(await bridge.methods.active().call())
      .to.be.equal(false, 'Wrong active status');
  });

  it('Update connector deploy value', async () => {

    await bridge.methods.updateConnectorDeployValue({
      _connectorDeployValue: 1
    }).send({
      from: bridgeOwner.address,
      amount: locklift.utils.toNano(1),
    });

    expect(await bridge.methods.connectorDeployValue().call())
        .to.be.equal(1, 'Wrong connector deploy value');
  });
  
  it('Update manager address', async () => {
    expect(await bridge.methods.manager().call())
      .to.be.equal(bridgeOwner.address, 'Wrong manager address');

    await bridge.methods.setManager({
      _manager: zeroAddress
    }).send({
      from: bridgeOwner.address,
      amount: locklift.utils.toNano(1),
    });

    expect(await bridge.methods.manager().call())
      .to.be.equal(zeroAddress, 'Wrong manager address');
  });
});
