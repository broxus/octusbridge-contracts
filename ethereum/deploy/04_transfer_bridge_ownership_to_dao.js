module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  
  const dao = await deployments.get('DAO');
  
  await deployments.execute(
    'Bridge',
    {
      from: deployer,
      log: true,
    },
    'transferOwnership',
    dao.address,
  );
};

module.exports.tags = ['Transfer bridge ownership to DAO'];
