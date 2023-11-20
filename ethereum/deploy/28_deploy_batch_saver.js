const deterministicDeployment = ['multivault-venom-main'];


module.exports = async ({getNamedAccounts, deployments}) => {
    const {
        deployer,
        multivault: multivault_,
    } = await getNamedAccounts();

    // - Get multivault address
    let multivault;

    if (multivault_ === ethers.constants.AddressZero) {
        const MultiVault = await deployments.get('MultiVault');

        multivault = MultiVault.address;
    } else {
        multivault = multivault_;
    }

    // Deploy diamond
    await deployments.deploy('BatchSaver', {
        from: deployer,
        log: true,
        deterministicDeployment,
        args: [
            multivault
        ]
    });
};


module.exports.tags = ['Deploy_Batch_Saver'];

