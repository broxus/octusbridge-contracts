const USDT_VAULT_ADDR = '0x4cb1fa4dceef4ef1b55362cc4eeee6d12611e1a0';

module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer } = await getNamedAccounts();

    await deployments.deploy('Convex3StableStrategy', {
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

module.exports.tags = ['Deploy_USDT_Convex3_Strategy'];
