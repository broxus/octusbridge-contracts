const hre = require("hardhat");


async function main() {
  const admin = await hre.upgrades.admin.getInstance();
  
  // console.log(admin);
  console.log(`Proxy admin: ${admin.address}`);
}


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
