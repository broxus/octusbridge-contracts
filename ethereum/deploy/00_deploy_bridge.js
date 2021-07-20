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
          {
            requiredSignatures: 5
          },
          relays.map(a => a.address),
        ],
      }
    }
  });
};

module.exports.tags = ['Bridge'];
