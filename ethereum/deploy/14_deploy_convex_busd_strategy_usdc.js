module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer, usdc_vault } = await getNamedAccounts();

    const busd_strategy = await deployments.get('ConvexBUSDStrategy');
    const proxy_admin = await deployments.get('DefaultProxyAdmin');

    const ABI = ["function initialize(address _vault)"];
    const encoder = new ethers.utils.Interface(ABI);
    const encoded = encoder.encodeFunctionData("initialize", [usdc_vault]);

    const usdc_strategy = await deployments.deploy('ConvexBUSDStrategyUSDC_Proxy', {
        contract: '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy',
        from: deployer,
        log: true,
        args: [
            busd_strategy.address,
            proxy_admin.address,
            encoded
        ]
    });

    await deployments.save('ConvexBUSDStrategyUSDC', {
        abi: busd_strategy.abi,
        address: usdc_strategy.address
    });
};

module.exports.tags = ['Deploy_USDC_Convex_BUSD'];
