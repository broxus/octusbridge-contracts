const USDC_VAULT_ADDR = '0xf8a0d53ddc6c92c3c59824f380c0f3d2a3cf521c';


module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer } = await getNamedAccounts();

    await deployments.deploy('ConvexFrax', {
        from: deployer,
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
