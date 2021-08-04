const hre = require('hardhat');

module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  
  const dao = await deployments.get('DAO');
  
  // Deploy token lock for each token in hardhat config
  for (const [token] of hre.config.tokens) {
    await deployments.execute(
      `TokenLock_${token}`,
      {
        from: deployer,
        log: true,
      },
      'transferOwnership',
      dao.address,
    );
  }
};

module.exports.tags = ['Transfer token locks ownership to dao'];
