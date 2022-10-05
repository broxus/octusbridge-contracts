const DAI_VAULT_ADDR = '0x032d06b4cc8a914b85615acd0131c3e0a7330968';


module.exports = async ({getNamedAccounts, deployments}) => {
    // const { deployer } = await getNamedAccounts();
    //
    // const frax_strategy = await deployments.get('ConvexFraxStrategy');
    // const proxy_admin = await deployments.get('DefaultProxyAdmin');
    //
    // const ABI = ["function initialize(address _vault)"];
    // const encoder = new ethers.utils.Interface(ABI);
    // const encoded = encoder.encodeFunctionData("initialize", [DAI_VAULT_ADDR]);
    //
    // const dai = await deployments.deploy('ConvexFraxStrategyDAI_Proxy', {
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
    // await deployments.save('ConvexFraxStrategyDAI', {
    //     abi: frax_strategy.abi,
    //     address: dai.address
    // });
};

module.exports.tags = ['Deploy_DAI_Convex_Frax'];
