module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  
  const vault = await deployments.get('Vault');
  
  await deployments.execute(
    'Registry',
    {
      from: deployer,
      log: true,
    },
    'newVaultRelease',
    vault.address
  );
};

module.exports.tags = ['Execute_Registry_newVaultRelease'];
