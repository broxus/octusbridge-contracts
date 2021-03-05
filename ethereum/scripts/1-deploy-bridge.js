const hre = require("hardhat");
const meta = require('./meta');


async function main() {
  const Bridge = await hre.ethers.getContractFactory("Bridge");

  const bridge = await hre.upgrades.deployProxy(Bridge, [
    meta.relays,
    meta.multisig,
    [0, 2]
  ]);
  
  // await bridge.deployed();

  console.log(`Bridge address: ${bridge.address}`);

  const admin = await hre.upgrades.admin.getInstance();
  console.log(`Proxy admin: ${admin.address}`);
}


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
