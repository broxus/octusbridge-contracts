module.exports = async ({getNamedAccounts, deployments}) => {
    const {
        deployer,
        weth,
        multivault: multivault_,
        owner
    } = await getNamedAccounts();

    // - Get multivault address
    let multivault_address;

    if (multivault_ === ethers.constants.AddressZero) {
        const MultiVault = await deployments.get('MultiVault');

        multivault_address = MultiVault.address;
    } else {
        multivault_address = multivault_;
    }
    
    await deployments.deploy('UnwrapNativeToken', {
        from: deployer,
        log: true,
        deterministicDeployment: ['multivault-venom-main'],
        proxy:{
            proxyContract: 'EIP173ProxyWithReceive',
        }
    });

    await deployments.execute(
        'UnwrapNativeToken',
        {
            from: deployer,
            log: true
        },
        'initialize',
        weth,
        multivault_address
    );

    await deployments.execute(
        'UnwrapNativeToken',
        {
            from: deployer,
            log: true,
        },
        'transferOwnership',
        owner
    );
};

module.exports.tags = ['Deploy_Unwrap_Native_Token'];
