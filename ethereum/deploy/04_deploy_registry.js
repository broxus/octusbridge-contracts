module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  
  const bridge = await deployments.get('Bridge');
  const proxyAdmin = await deployments.get('DefaultProxyAdmin');
  
  await deployments.deploy('Registry', {
    from: deployer,
    log: true,
    args: [
      bridge.address,
      proxyAdmin.address,
    ]
  });
};

module.exports.tags = ['Deploy_Registry'];
