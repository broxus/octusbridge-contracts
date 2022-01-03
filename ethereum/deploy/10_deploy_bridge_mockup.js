module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer } = await getNamedAccounts();

    await deployments.deploy('BridgeMockup', {
        from: deployer,
        log: true,
    });
};

module.exports.tags = ['Deploy_Bridge_Mockup'];
