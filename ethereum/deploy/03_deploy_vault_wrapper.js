module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  
  await deployments.deploy('VaultWrapper', {
    from: deployer,
    log: true,
  });
};

module.exports.tags = ['Deploy_VaultWrapper'];
