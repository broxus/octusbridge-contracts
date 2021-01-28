const Bridge = artifacts.require("Bridge");
const ProxySimple = artifacts.require("ProxySimple");
const ProxyToken = artifacts.require("ProxyToken");
const TestToken = artifacts.require("TestToken");


module.exports = async (deployer, network, accounts) => {
  await deployer.deploy(
    Bridge,
    accounts,
    accounts[0],
  );
  
  await deployer.deploy(
    ProxySimple,
    Bridge.address,
  );

  await deployer.deploy(
    TestToken,
  );
  
  await deployer.deploy(
    ProxyToken,
    {
      token: TestToken.address,
      bridge: Bridge.address,
      active: true,
      requiredConfirmations: 2
    },
    accounts[0]
  );
};
