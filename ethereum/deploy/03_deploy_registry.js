module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  
  const bridge = await deployments.get('Bridge');
  
  await deployments.deploy('Registry', {
    from: deployer,
    log: true,
    args: [
      bridge.address,
    ]
  });
};

module.exports.tags = ['Deploy_Registry'];
