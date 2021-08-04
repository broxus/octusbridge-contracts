module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  
  const bridge = await deployments.get('Bridge');
  
  await deployments.deploy('DAO', {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          bridge.address
        ],
      }
    }
  });
};

module.exports.tags = ['Deploy DAO'];
