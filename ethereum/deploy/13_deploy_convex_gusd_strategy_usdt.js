module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer, usdt_vault } = await getNamedAccounts();

    const gusd_strategy = await deployments.deploy('ConvexGUSDStrategyUSDT', {
        contract: 'ConvexGUSDStrategy',
        from: deployer,
        log: true,
        proxy: {
            proxyContract: 'OpenZeppelinTransparentProxy',
            execute: {
                methodName: 'initialize',
                args: [
                    usdt_vault
                ],
            }
        }
    });

    await deployments.save('ConvexGUSDStrategy', {
        abi: gusd_strategy.abi,
        address: gusd_strategy.implementation
    });
};

module.exports.tags = ['Deploy_USDT_Convex_GUSD'];
