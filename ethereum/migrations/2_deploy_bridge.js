const {
  deployProxy,
} = require('@openzeppelin/truffle-upgrades');


const Bridge = artifacts.require("Bridge");
const ProxyTokenLock = artifacts.require("ProxyTokenLock");


module.exports = async (deployer, network, accounts) => {
  const owners = accounts;
  const admin = '0x3f3F2b555F516ba67f1135269cCA62Bc6f9d07A5';
  
  const token = '0xdac17f958d2ee523a2206206994597c13d831ec7'; // token
  const requiredConfirmations = 2;
  
  await deployProxy(
    Bridge,
    [owners, admin],
    {
      deployer,
      initializer: 'initialize'
    },
  );

  await deployProxy(
    ProxyTokenLock,
    [{
      token,
      bridge: Bridge.address,
      active: true,
      requiredConfirmations,
      fee: {
        numerator: 1,
        denominator: 100,
      }
    }, admin],
    {
      deployer,
      initializer: 'initialize'
    },
  );
};
