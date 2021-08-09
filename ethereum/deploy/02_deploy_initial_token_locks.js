const hre = require('hardhat');

module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  
  const bridge = await deployments.get('Bridge');

  // Deploy token lock for each token in hardhat config
  for (const [token, address] of hre.config.tokens) {
    await deployments.deploy(`TokenLock_${token}`, {
      from: deployer,
      contract: 'TokenLock',
      log: true,
      proxy: {
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [
            deployer,
            address,
            bridge.address,
          ],
        }
      }
    });
  }
};

module.exports.tags = ['Deploy initial token locks'];
