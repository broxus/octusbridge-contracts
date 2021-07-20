module.exports = async ({getNamedAccounts, deployments}) => {
  const { owner } = await getNamedAccounts();
  
  const dao = await deployments.get('DAO');
  
  await deployments.execute(
    'Bridge',
    {
      from: owner,
      log: true,
    },
    'transferOwnership',
    dao.address,
  );
};

module.exports.tags = ['Transfer bridge ownership to DAO'];
