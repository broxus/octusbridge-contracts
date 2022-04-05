const DAI_VAULT_ADDR = '0x032d06b4cc8a914b85615acd0131c3e0a7330968';


module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
    const { deployer, owner } = await getNamedAccounts();

    const chainId = await getChainId();
    let strategy_deployer = deployer;
    if (chainId.toString() === '1111') {
        strategy_deployer = owner;
    }

    await deployments.deploy('ConvexFraxStrategyDAI', {
        contract: 'ConvexFraxStrategy',
        from: strategy_deployer,
        log: true,
        proxy: {
            proxyContract: 'OpenZeppelinTransparentProxy',
            execute: {
                methodName: 'initialize',
                args: [
                    DAI_VAULT_ADDR
                ],
            }
        }
    });
};

module.exports.tags = ['Deploy_DAI_Convex_Frax'];
