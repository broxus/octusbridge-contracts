const hre = require("hardhat");


async function main() {
  const ProxyTokenLock = await hre.ethers.getContractFactory('ProxyTokenLock');

  const proxyTokenLock = await ProxyTokenLock.deploy();
  await proxyTokenLock.deployed();
  
  console.log(`ProxyTokenLock: ${proxyTokenLock.address}`);
}


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
