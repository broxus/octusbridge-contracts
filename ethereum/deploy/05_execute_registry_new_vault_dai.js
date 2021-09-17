const { legos } = require('@studydefi/money-legos');


module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer, guardian } = await getNamedAccounts();
  
  await deployments.execute(
    'Registry',
    {
      from: deployer,
      estimatedGasLimit: 12000000,
      log: true
    },
    'newVault',
    legos.erc20.dai.address,
    guardian,
    0
  );
};

module.exports.tags = ['Execute_Registry_newVault_dai'];
