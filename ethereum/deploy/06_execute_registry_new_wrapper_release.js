module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  
  const wrapper = await deployments.get('VaultWrapper');
  
  await deployments.execute(
    'Registry',
    {
      from: deployer,
      log: true,
    },
    'newWrapperRelease',
    wrapper.address
  );
};

module.exports.tags = ['Execute_Registry_newWrapperRelease'];
