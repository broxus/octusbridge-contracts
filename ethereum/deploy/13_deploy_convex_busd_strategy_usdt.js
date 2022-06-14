module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer, usdt_vault } = await getNamedAccounts();

    const busd_strategy = await deployments.deploy('ConvexBUSDStrategyUSDT', {
        contract: 'ConvexBUSDStrategy',
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

    await deployments.save('ConvexBUSDStrategy', {
        abi: busd_strategy.abi,
        address: busd_strategy.implementation
    });
};

module.exports.tags = ['Deploy_USDT_Convex_BUSD'];
