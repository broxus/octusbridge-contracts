const deterministicDeployment = ['multivault-venom-main'];
const _ = require('lodash');


module.exports = async ({getNamedAccounts, deployments}) => {
    const {
        deployer,
    } = await getNamedAccounts();

    // Deploy proxy admin
    await deployments.deploy('MultiVaultProxyAdmin', {
        contract: 'contracts/multivault/proxy/ProxyAdmin.sol:ProxyAdmin',
        from: deployer,
        log: true,
        deterministicDeployment,
        args: [
            deployer
        ]
    });

    // Deploy proxy with empty implementation
    const multiVaultProxyAdmin = await deployments.get('MultiVaultProxyAdmin');

    await deployments.deploy('MultiVaultProxy', {
        contract: 'contracts/multivault/proxy/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy',
        from: deployer,
        log: true,
        deterministicDeployment,
        args: [
            ethers.constants.AddressZero,
            multiVaultProxyAdmin.address,
            '0x'
        ]
    });
};

module.exports.tags = ['Deploy_MultiVault_Proxy'];
