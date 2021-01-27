require('dotenv').config({ path: './../../env/ethereum.env' });

const Bridge = artifacts.require("Bridge");
const ProxySimple = artifacts.require("ProxySimple");


module.exports = async (deployer, network ,accounts) => {
  await deployer.deploy(
    Bridge,
    accounts,
    accounts[0],
  );
  
  await deployer.deploy(
    ProxySimple,
    Bridge.address,
  );
};
