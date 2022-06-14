module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer, dai_vault } = await getNamedAccounts();

    const busd_strategy = await deployments.get('ConvexBUSDStrategy');
    const proxy_admin = await deployments.get('DefaultProxyAdmin');

    const ABI = ["function initialize(address _vault)"];
    const encoder = new ethers.utils.Interface(ABI);
    const encoded = encoder.encodeFunctionData("initialize", [dai_vault]);

    const dai_strategy = await deployments.deploy('ConvexBUSDStrategyDAI_Proxy', {
        contract: '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy',
        from: deployer,
        log: true,
        args: [
            busd_strategy.address,
            proxy_admin.address,
            encoded
        ]
    });

    await deployments.save('ConvexBUSDStrategyDAI', {
        abi: busd_strategy.abi,
        address: dai_strategy.address
    });
};

module.exports.tags = ['Deploy_DAI_Convex_BUSD'];
