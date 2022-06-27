module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer, dai_vault } = await getNamedAccounts();

    const gusd_strategy = await deployments.get('ConvexGUSDStrategy');
    const proxy_admin = await deployments.get('DefaultProxyAdmin');

    const ABI = ["function initialize(address _vault)"];
    const encoder = new ethers.utils.Interface(ABI);
    const encoded = encoder.encodeFunctionData("initialize", [dai_vault]);

    const dai_strategy = await deployments.deploy('ConvexGUSDStrategyDAI_Proxy', {
        contract: '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy',
        from: deployer,
        log: true,
        args: [
            gusd_strategy.address,
            proxy_admin.address,
            encoded
        ]
    });

    await deployments.save('ConvexGUSDStrategyDAI', {
        abi: gusd_strategy.abi,
        address: dai_strategy.address
    });
};

module.exports.tags = ['Deploy_DAI_Convex_GUSD'];
