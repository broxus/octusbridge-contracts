module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer, owner } = await getNamedAccounts();

  const relays = await ethers.getSigners();
  
  await deployments.deploy('Bridge', {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          owner,
          5, // Minimum required signatures
          100, // Relay TTL after round in seconds
          0, // Initial round number
          Math.floor(Date.now() / 1000) + 604800, // Initial round end, after 1 week
          relays.map(a => a.address), // Initial relays
        ],
      }
    }
  });
};

module.exports.tags = ['Deploy_Bridge'];
