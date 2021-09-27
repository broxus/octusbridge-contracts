const hre = require("hardhat");
const meta = require('./meta');


const bridge = '0xAA5f2fc251b1387F8b828eD66d4508215B1b6ee7';


async function main() {
  const admin = await hre.upgrades.admin.getInstance();
  console.log(`Proxy admin: ${admin.address}`);

  const ProxyTokenLock = await hre.ethers.getContractFactory('ProxyTokenLock');

  const proxyTokenLock = await hre.upgrades.deployProxy(
    ProxyTokenLock,
    [
      [
        meta.token,
        bridge,
        true,
        meta.unlockTokensRequiredConfirmations,
        [1, 1000]
      ],
      meta.multisig
    ],
  );

  console.log(`Proxy token lock: ${proxyTokenLock.address}`);
}


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
