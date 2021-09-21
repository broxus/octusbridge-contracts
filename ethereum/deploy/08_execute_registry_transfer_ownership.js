module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer, owner } = await getNamedAccounts();
  
  await deployments.execute(
    'Registry',
    {
      from: deployer,
      log: true,
    },
    'transferOwnership',
    owner
  );
};

module.exports.tags = ['Execute_Registry_transferOwnership'];
