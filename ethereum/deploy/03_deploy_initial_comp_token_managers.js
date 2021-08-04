module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deployer } = await getNamedAccounts();
  
  const dao = await deployments.get('DAO');
  
  // Token name, cToken, share (100% = 100000)
  const tokens = [
    ['uni','0x35a18000230da775cac24873d00ff85bccded550', 10000],
    ['dai','0x5d3a536e4d6dbd6114cc1ead35777bab948e3643', 25000],
    ['comp','0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4', 10000],
    ['usdc','0x39aa39c021dfbae8fac545936693ac917d5e7563', 10000],
  ];
  
  for (const [token,ctoken,share] of tokens) {
    const tokenLock = await deployments.get(`TokenLock_${token}`);
    
    const tokenManager = await deployments.deploy(`CompFarmingTokenManager_${token}`, {
      from: deployer,
      contract: 'CompFarmingTokenManager',
      log: true,
      proxy: {
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [
            tokenLock.address,
            ctoken,
          ],
        }
      }
    });
    
    // Add token manager to token lock
    await deployments.execute(
      `TokenLock_${token}`,
      {
        from: deployer,
        log: true,
      },
      'addTokenManager',
      tokenManager.address,
      [share]
    );
  }
};


module.exports.tags = ['Deploy initial comp token managers'];
