const USDC_VAULT_ADDR = '0xf8a0d53ddc6c92c3c59824f380c0f3d2a3cf521c';


module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
    const { deployer, owner } = await getNamedAccounts();

    const chainId = await getChainId();
    let strategy_deployer = deployer;
    if (chainId.toString() === '1111') {
        strategy_deployer = owner;
    }

    await deployments.deploy('ConvexFraxStrategyUSDC', {
        contract: 'ConvexFraxStrategy',
        from: strategy_deployer,
        log: true,
        proxy: {
            proxyContract: 'OpenZeppelinTransparentProxy',
            execute: {
                methodName: 'initialize',
                args: [
                    USDC_VAULT_ADDR
                ],
            }
        }
    });
};

module.exports.tags = ['Deploy_USDC_Convex_Frax'];
