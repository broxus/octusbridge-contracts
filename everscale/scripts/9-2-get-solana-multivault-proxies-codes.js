const main = async () => {
    const ProxyMultiVaultSolanaNative = await locklift.factory.getContract('ProxyMultiVaultSolanaNative');
    const ProxyMultiVaultSolanaAlien = await locklift.factory.getContract('ProxyMultiVaultSolanaAlien');

    for (const contract of [ProxyMultiVaultSolanaNative, ProxyMultiVaultSolanaAlien]) {
        console.log(contract.name);
        console.log(contract.code);
        console.log('');
    }
};


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
