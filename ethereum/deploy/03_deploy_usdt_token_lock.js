module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  
  const dao = await deployments.get('DAO');
  const bridge = await deployments.get('Bridge');
  
  await deployments.deploy('TokenLock', {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          dao.address,
          {
            active: true,
            bridge: bridge.address,
            token: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
          }
        ],
      }
    }
  });
};

module.exports.tags = ['USDT token lock'];
