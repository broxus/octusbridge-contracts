const USDT_VAULT_ADDR = '0x81598d5362eac63310e5719315497c5b8980c579';


module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer } = await getNamedAccounts();

    await deployments.deploy('ConvexFraxStrategy', {
        from: deployer,
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
};

module.exports.tags = ['Deploy_USDT_Convex_Frax'];
