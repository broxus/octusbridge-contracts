module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer, owner } = await getNamedAccounts();

  console.log(deployer, owner);
  
  const relays = await ethers.getSigners();
  
  console.log(relays.map(a => a.address));
  
  await deployments.deploy('Bridge', {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          owner,
          3, // Minimum required signatures
          604800, // Relay TTL after round in seconds, 1 week
          0, // Initial round number
          Math.floor(Date.now() / 1000) + 604800, // Initial round end, after 1 week
          [
            "0x59861a7db8e01daf3763468325161e41bec59821",
            "0x440734bbacc1cfae9b5b16f14eb7423a1f069af0",
            "0x0fa6339155d9dd1fa7e4fd8feba84c675b5874ff"
          ], // Initial relays
        ],
      }
    }
  });
};

module.exports.tags = ['Deploy_Bridge'];
