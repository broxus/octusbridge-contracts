module.exports = async ({getNamedAccounts, deployments}) => {
    const {
        deployer,
    } = await getNamedAccounts();


    const proxy = await deployments.get('MultiVaultProxy');
    const diamond = await ethers.getContract('MultiVaultDiamond');

    const {
        data: diamondInitialize
    } = await diamond.populateTransaction.initialize(deployer);

    // Initialize proxy with diamond implementation
    await deployments.execute('MultiVaultProxyAdmin',
        {
            from: deployer,
            log: true,
        },
        'upgradeAndCall',
        proxy.address,
        diamond.address,
        diamondInitialize
    );
};


module.exports.tags = ['Deploy_MultiVault_Initialize_Diamond'];
