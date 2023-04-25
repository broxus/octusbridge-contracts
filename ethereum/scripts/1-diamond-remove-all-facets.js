const diamond = '0x54c55369a6900731d22eacb0df7c0253cf19dfff';


const DIAMOND_CUT_SELECTOR = '0x7a0ed627';
const DIAMOND_LOUPE_SELECTOR = '0x1f931c1c';
const DIAMOND_OWNERSHIP_SELECTOR = '0xf2fde38b';


const main = async () => {
    const Diamond = await ethers.getContractAt('DiamondLoupeFacet', diamond);

    const facets = await Diamond.facets();

    // console.log(facets.length);

    const multivault_facets = facets.filter(facet => {
        if (
            facet.functionSelectors.includes(DIAMOND_LOUPE_SELECTOR) ||
            facet.functionSelectors.includes(DIAMOND_CUT_SELECTOR) ||
            facet.functionSelectors.includes(DIAMOND_OWNERSHIP_SELECTOR)
        ) {
            return false;
        }

        return true;
    });

    // console.log(multivault_facets.length);
    // console.log(multivault_facets);

    const diamond_cut = multivault_facets.map(facet => {
        return [
            '0x0000000000000000000000000000000000000000',
            2,
            facet.functionSelectors
        ];
    });

    console.log(JSON.stringify(diamond_cut));
};


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

