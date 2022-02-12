module.exports = async ({getNamedAccounts, deployments}) => {s
    const { deployer, owner } = await getNamedAccounts();

    await deployments.deploy('Token', {
        from: deployer,
        log: true,
        args: [
            ethers.utils.parseUnits('100000', 18),
            owner,
        ]
    });
};

module.exports.tags = ['Deploy_Token'];
