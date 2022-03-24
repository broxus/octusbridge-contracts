module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer } = await getNamedAccounts();

    await deployments.deploy('MultiVault', {
        from: deployer,
        log: true,
        deterministicDeployment: ['multivault-2'],
        proxy: {
            proxyContract: 'OpenZeppelinTransparentProxy',
        }
    });
};

module.exports.tags = ['Deploy_MultiVault'];
