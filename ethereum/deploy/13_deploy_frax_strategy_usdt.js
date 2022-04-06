const USDT_VAULT_ADDR = '0x81598d5362eac63310e5719315497c5b8980c579';


module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
    const { deployer, owner } = await getNamedAccounts();

    const chainId = await getChainId();
    let strategy_deployer = deployer;
    if (chainId.toString() === '1111') {
        strategy_deployer = owner;
    }

    await deployments.deploy('ConvexFraxStrategyUSDT', {
        contract: 'ConvexFraxStrategy',
        from: strategy_deployer,
        log: true,
        proxy: {
            proxyContract: 'OpenZeppelinTransparentProxy',
            execute: {
                methodName: 'initialize',
                args: [
                    USDT_VAULT_ADDR
                ],
            }
        }
    });

    const frax = (await deployments.get('ConvexFraxStrategyUSDT'));
    await deployments.save('ConvexFraxStrategyImplementation', {
        abi: frax.abi,
        address: frax.address
    });
};

module.exports.tags = ['Deploy_USDT_Convex_Frax'];
