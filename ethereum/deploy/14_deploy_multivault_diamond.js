const deterministicDeployment = ['multivault-venom-main'];


module.exports = async ({getNamedAccounts, deployments}) => {
    const {
        deployer,
    } = await getNamedAccounts();

    // Deploy diamond
    await deployments.deploy('MultiVaultDiamond', {
        contract: 'contracts/multivault/Diamond.sol:Diamond',
        from: deployer,
        log: true,
        deterministicDeployment
    });
};


module.exports.tags = ['Deploy_MultiVault_Diamond'];
