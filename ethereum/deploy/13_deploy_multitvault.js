const deterministicDeployment = ['multivault-3'];


module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer, owner, bridge: bridge_ } = await getNamedAccounts();

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

    // Deploy diamond
    // Initialize proxy
    let bridge_address;

    if (bridge_ === ethers.constants.AddressZero) {
        const bridge = await deployments.get('Bridge');

        bridge_address = bridge.address;
    } else {
        bridge_address = bridge_;
    }

    await deployments.diamond.deploy('MultiVault', {
        from: deployer,
        owner: owner,
        facets: [
            'MultiVaultFacetDeposit',
            'MultiVaultFacetFees',
            'MultiVaultFacetPendingWithdrawals',
            'MultiVaultFacetSettings',
            'MultiVaultFacetTokens',
            'MultiVaultFacetWithdraw',
            'MultiVaultFacetLiquidity'
        ],
        execute: {
            methodName: 'initialize',
            args: [bridge_address, owner]
        }
    });

    // // Deploy implementation
    // const artifact = await deployments.getExtendedArtifact('MultiVault');
    // console.log(artifact.bytecode.length / 2);
    //
    // await deployments.deploy('MultiVaultImplementation', {
    //     contract: 'MultiVault',
    //     from: deployer,
    //     log: true,
    //     deterministicDeployment,
    // });
    //
    // // Set new implementation
    // const multiVaultProxy = await deployments.get('MultiVaultProxy');
    // const multiVaultImplementation = await deployments.get('MultiVaultImplementation');
    //
    // await deployments.execute('MultiVaultProxyAdmin',
    //     {
    //         from: deployer,
    //         log: true,
    //     },
    //     'upgrade',
    //     multiVaultProxy.address,
    //     multiVaultImplementation.address
    // );
    //
    // // - dev: save actual MultiVault
    // const {
    //     abi: multiVaultAbi
    // } = await deployments.getExtendedArtifact('MultiVault');
    //
    // await deployments.save('MultiVault', {
    //     abi: multiVaultAbi,
    //     address: multiVaultProxy.address,
    // });
    //
    //
    // // - dev: get init token code hash
    // // const tokenInitCodeHash = await deployments.read('MultiVault', 'getInitHash');
    // //
    // // console.log(`MultiVaultToken init code hash: ${tokenInitCodeHash}`);
    //
    // await deployments.execute('MultiVault',
    //     {
    //         from: deployer,
    //         log: true
    //     },
    //     'initialize',
    //     bridge_address,
    //     owner
    // );
    //
    // // Transfer proxy admin ownership
    // await deployments.execute('MultiVaultProxyAdmin',
    //     {
    //         from: deployer,
    //         log: true
    //     },
    //     'transferOwnership',
    //     owner
    // );
};

module.exports.tags = ['Deploy_MultiVault'];
