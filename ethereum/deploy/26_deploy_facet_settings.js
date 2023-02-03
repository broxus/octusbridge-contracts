const deterministicDeployment = ['multivault-3'];


module.exports = async ({getNamedAccounts, deployments}) => {
    const {
        deployer,
    } = await getNamedAccounts();

    // Deploy diamond
    await deployments.deploy('MultiVaultFacetSettings', {
        from: deployer,
        log: true,
    });
};


module.exports.tags = ['Deploy_MultiVault_Facet_Settings'];

