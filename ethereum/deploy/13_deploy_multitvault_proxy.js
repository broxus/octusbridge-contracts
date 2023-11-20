const deterministicDeployment = ['multivault-venom-main'];
const _ = require('lodash');


module.exports = async ({getNamedAccounts, deployments}) => {
    const {
        deployer,
    } = await getNamedAccounts();

    // Deploy diamond
    await deployments.deploy('MultiVaultDiamond', {
        contract: 'contracts/multivault/Diamond.sol:Diamond',
        from: deployer,
        log: true,
        deterministicDeployment
    });
    
    const MultiVaultDiamond = await deployments.get('MultiVaultDiamond');
    const diamond = await ethers.getContract('MultiVaultDiamond');

    const {
        data: diamondInitialize
    } = await diamond.populateTransaction.initialize(deployer);

    // Deploy proxy with diamond implementation
    await deployments.deploy('MultiVaultProxy', {
        contract: 'TransparentUpgradeableProxy',
        from: deployer,
        log: true,
        deterministicDeployment,
        args: [
            MultiVaultDiamond.address,
            deployer,
            diamondInitialize
        ]
    });
};

module.exports.tags = ['Deploy_MultiVault_Proxy'];
