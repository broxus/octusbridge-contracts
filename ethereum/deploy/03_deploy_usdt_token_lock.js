module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  
  const dao = await deployments.get('DAO');
  const bridge = await deployments.get('Bridge');
  
  const { usdt } = await getNamedAccounts();
  
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
            token: usdt
          }
        ],
      }
    }
  });
};

module.exports.tags = ['USDT token lock'];
