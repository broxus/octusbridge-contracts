const deterministicDeployment = ['multivault-venom-main'];


module.exports = async ({getNamedAccounts, deployments}) => {
    const {
        deployer,
    } = await getNamedAccounts();

    // Deploy diamond
    await deployments.deploy('MultiVaultFacetPendingWithdrawals', {
        from: deployer,
        log: true,
    });
};


module.exports.tags = ['Deploy_MultiVault_Facet_Pending_Withdrawals'];
