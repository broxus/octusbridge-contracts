const main = async () => {
    const ProxyMultiVaultNative_V2 = await locklift.factory.getContract('ProxyMultiVaultNative_V2');
    const ProxyMultiVaultAlien_V5 = await locklift.factory.getContract('ProxyMultiVaultAlien_V5');

    for (const contract of [ProxyMultiVaultNative_V2, ProxyMultiVaultAlien_V5]) {
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
