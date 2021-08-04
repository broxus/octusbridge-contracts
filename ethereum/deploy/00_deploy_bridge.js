module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();

  const relays = await ethers.getSigners();
  
  await deployments.deploy('Bridge', {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          deployer,
          {
            requiredSignatures: 5
          },
          relays.map(a => a.address),
        ],
      }
    }
  });
};

module.exports.tags = ['Deploy bridge'];
