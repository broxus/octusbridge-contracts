const hre = require("hardhat");


async function main() {
  const Bridge = await hre.ethers.getContractFactory('Bridge');
  
  const bridge = await Bridge.deploy();
  await bridge.deployed();
  
  console.log(`Bridge: ${bridge.address}`);
}


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
