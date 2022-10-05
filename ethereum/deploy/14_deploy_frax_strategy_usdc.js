const USDC_VAULT_ADDR = '0xf8a0d53ddc6c92c3c59824f380c0f3d2a3cf521c';


module.exports = async ({getNamedAccounts, deployments}) => {
    // const { deployer } = await getNamedAccounts();
    //
    // const frax_strategy = await deployments.get('ConvexFraxStrategy');
    // const proxy_admin = await deployments.get('DefaultProxyAdmin');
    //
    // const ABI = ["function initialize(address _vault)"];
    // const encoder = new ethers.utils.Interface(ABI);
    // const encoded = encoder.encodeFunctionData("initialize", [USDC_VAULT_ADDR]);
    //
    // const usdc = await deployments.deploy('ConvexFraxStrategyUSDC_Proxy', {
    //     contract: '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy',
    //     from: deployer,
    //     log: true,
    //     args: [
    //         frax_strategy.address,
    //         proxy_admin.address,
    //         encoded
    //     ]
    // });
    //
    // await deployments.save('ConvexFraxStrategyUSDC', {
    //     abi: frax_strategy.abi,
    //     address: usdc.address
    // });
};

module.exports.tags = ['Deploy_USDC_Convex_Frax'];
