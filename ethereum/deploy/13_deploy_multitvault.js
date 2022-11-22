const deterministicDeployment = ['multivault-3'];
const _ = require('lodash');


module.exports = async ({getNamedAccounts, deployments}) => {
    const {
        deployer,
        owner,
        bridge: bridge_
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

    // Deploy diamond
    await deployments.deploy('MultiVaultDiamond', {
        contract: 'contracts/multivault/Diamond.sol:Diamond',
        from: deployer,
        log: true,
        deterministicDeployment
    });

    const proxy = await deployments.get('MultiVaultProxy');
    const diamond = await ethers.getContract('MultiVaultDiamond');

    const {
        data: diamondInitialize
    } = await diamond.populateTransaction.initialize(deployer);

    // Initialize proxy with diamond implementation
    await deployments.execute('MultiVaultProxyAdmin',
        {
            from: deployer,
            log: true,
        },
        'upgradeAndCall',
        proxy.address,
        diamond.address,
        diamondInitialize
    );

    let bridge_address;

    if (bridge_ === ethers.constants.AddressZero) {
        const bridge = await deployments.get('Bridge');

        bridge_address = bridge.address;
    } else {
        bridge_address = bridge_;
    }

    // Set up diamond cuts
    // Initialize settings facet
    const facets = [
        'MultiVaultFacetDeposit',
        'MultiVaultFacetFees',
        'MultiVaultFacetPendingWithdrawals',
        'MultiVaultFacetSettings',
        'MultiVaultFacetTokens',
        'MultiVaultFacetWithdraw',
        'MultiVaultFacetLiquidity'
    ];

    // Deploy every facet
    for (const facet of facets) {
        await deployments.deploy(facet, {
            from: deployer,
            log: true,
        });
    }

    const facetCuts = await Promise.all(facets.map(async (name) => {
        const facet = await ethers.getContract(name);

        const functionSelectors = Object.entries(facet.interface.functions).map(([function_name, fn]) => {
            const sig_hash = ethers.utils.Interface.getSighash(fn);

            console.log(name, function_name, sig_hash);

            return sig_hash;
        });

        return {
            facetAddress: facet.address,
            action: 0,
            functionSelectors
        };
    }));

    // Check function selectors are unique
    // console.log(facetCuts);
    // TODO

    // Merge ABIs
    const diamondABI = await [
        ...facets,
        'DiamondCutFacet', 'DiamondLoupeFacet', 'DiamondOwnershipFacet'
    ].reduce(async (acc, name) => {
        const facet = await deployments.getExtendedArtifact(name);

        return [...await acc, ...facet.abi];
    }, []);

    await deployments.save('MultiVault', {
        abi: _.uniqWith(diamondABI, _.isEqual),
        address: proxy.address,
    });

    // Set diamond cuts and initialize bridge settings
    const settings = await ethers.getContract('MultiVaultFacetSettings');

    const {
        data: settingsInitialize
    } = await settings.populateTransaction.initialize(bridge_address, owner);

    await deployments.execute(
        'MultiVault',
        {
            from: deployer,
            log: true
        },
        'diamondCut',
        facetCuts,
        settings.address,
        settingsInitialize
    );
};

module.exports.tags = ['Deploy_MultiVault'];
