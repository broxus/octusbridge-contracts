module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer, owner } = await getNamedAccounts();
  
  await deployments.execute('DefaultProxyAdmin',
    {
      from: deployer,
      log: true,
    },
    'transferOwnership',
    owner
  );
};

module.exports.tags = ['Execute_DefaultProxyAdmin_transferOwnership'];
