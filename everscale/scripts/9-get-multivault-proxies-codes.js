const main = async () => {
    const ProxyMultiVaultNative = await locklift.factory.getContract('ProxyMultiVaultNative');
    const ProxyMultiVaultAlien = await locklift.factory.getContract('ProxyMultiVaultAlien');

    for (const contract of [ProxyMultiVaultNative, ProxyMultiVaultAlien]) {
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
