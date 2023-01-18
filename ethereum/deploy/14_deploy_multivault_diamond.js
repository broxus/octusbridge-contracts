const deterministicDeployment = ['multivault-3'];
const _ = require("lodash");


module.exports = async ({getNamedAccounts, deployments}) => {
    const {
        deployer,
        owner
    } = await getNamedAccounts();

    // Deploy diamond
    await deployments.deploy('MultiVaultDiamond', {
        contract: 'contracts/multivault/Diamond.sol:Diamond',
        from: deployer,
        log: true,
        deterministicDeployment
    });

    const diamond = await ethers.getContract('MultiVaultDiamond');

    const {
        data: diamondInitialize
    } = await diamond.populateTransaction.initialize(owner);

    console.log(`ProxyAdmin upgrade payload (sets owner to DiamondCuts owner): ${diamondInitialize}`);
};


module.exports.tags = ['Deploy_MultiVault_Diamond'];
