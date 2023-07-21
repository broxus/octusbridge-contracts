const getFunctionSelector = (function_name) => {
    return ethers.utils.id(function_name).substring(0, 10);
};


const main = async () => {
    // Set up diamond cuts
    // Initialize settings facet
    const facets = [
        ['MultiVaultFacetDeposit', '0x804f5828393590A2Cb1F74e44E09eAa4Bb83fE0F'],
        ['MultiVaultFacetFees', '0xf3F8B9b12aBcE67cc85fB6a908eeF290baf95e5C'],
        ['MultiVaultFacetPendingWithdrawals', '0xddb367b7a1741d57E2F3824d2DBfA665Fd7621E1'],
        ['MultiVaultFacetTokens', '0x960584a220cA946eFd209105f83F7f696C1e5169'],
        ['MultiVaultFacetWithdraw', '0x0145E451925C5Ff73294Da714E8dAb6cc3565918'],
        ['MultiVaultFacetLiquidity', '0x770db4cFb39807a96E28685248389BC54fc375e0'],
        ['MultiVaultFacetSettings', '0xea450337805c2f03844Ba099E6CdcA233140A35D'],
    ];

    const diamond_cut = facets.map(async ([facet, address]) => {
        const Facet = await ethers.getContractFactory(facet);

        const selectors = Object
            .keys(Facet.interface.functions)
            .map(f => getFunctionSelector(f));

        return [
            address,
            0,
            selectors
        ];
    });

    console.log(JSON.stringify(await Promise.all(diamond_cut)));
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

