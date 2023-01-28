module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployer, weth} = await getNamedAccounts();
    const {address: multiVaultAddress} = await deployments.get('MultiVault');
    await deployments.deploy('UnwrapNativeToken', {
        from: deployer,
        log: true,
        args: [
            weth,
            multiVaultAddress
        ]
    });
};

module.exports.tags = ['Deploy_Unwrap_Native_Token'];
