const _ = require("lodash");


module.exports = async ({getNamedAccounts, deployments}) => {
    const {
        deployer
    } = await getNamedAccounts();


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

    console.log(`Cuts: ${JSON.stringify(facetCuts)}`);

    // Merge ABIs
    const diamondABI = await [
        ...facets,
        'DiamondCutFacet', 'DiamondLoupeFacet', 'DiamondOwnershipFacet'
    ].reduce(async (acc, name) => {
        const facet = await deployments.getExtendedArtifact(name);

        return [...await acc, ...facet.abi];
    }, []);

    const proxy = await deployments.get('MultiVaultProxy');

    await deployments.save('MultiVault', {
        abi: _.uniqWith(diamondABI, _.isEqual),
        address: proxy.address,
    });

    await deployments.execute(
        'MultiVault',
        {
            from: deployer,
            log: true
        },
        'diamondCut',
        facetCuts,
        ethers.constants.AddressZero,
        '0x'
    );
};


module.exports.tags = ['Deploy_MultiVault_Set_Diamond_Cuts'];

