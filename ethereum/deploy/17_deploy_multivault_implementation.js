module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer } = await getNamedAccounts();

    await deployments.deploy('MultiVault', {
        from: deployer,
        log: true,
    });
};


module.exports.tags = ['Deploy_MultiVault_Implementation'];
