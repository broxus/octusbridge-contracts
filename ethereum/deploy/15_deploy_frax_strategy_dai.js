const DAI_VAULT_ADDR = '0x032d06b4cc8a914b85615acd0131c3e0a7330968';


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
                    DAI_VAULT_ADDR
                ],
            }
        }
    });
};

module.exports.tags = ['Deploy_DAI_Convex_Frax'];
