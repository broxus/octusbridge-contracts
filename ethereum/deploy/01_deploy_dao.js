module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer, owner } = await getNamedAccounts();

  const bridge = await deployments.get('Bridge');
  
  console.log(`DAO owner: ${owner}`);
  
  await deployments.deploy('DAO', {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          owner,
          bridge.address
        ],
      }
    }
  });
};

module.exports.tags = ['Deploy_DAO'];
