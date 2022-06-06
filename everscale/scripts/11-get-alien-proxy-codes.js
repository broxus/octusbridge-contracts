const main = async () => {
    const ProxyMultiVaultAlien_V1 = await locklift.factory.getContract('ProxyMultiVaultAlien_V1');
    const ProxyMultiVaultAlien_V2 = await locklift.factory.getContract('ProxyMultiVaultAlien_V2');
    const ProxyMultiVaultAlien_V3 = await locklift.factory.getContract('ProxyMultiVaultAlien_V3');

    console.log('ProxyMultiVaultAlien_V1');
    console.log(ProxyMultiVaultAlien_V1.code);
    console.log('');

    console.log('ProxyMultiVaultAlien_V2');
    console.log(ProxyMultiVaultAlien_V2.code);
    console.log('');

    console.log('ProxyMultiVaultAlien_V3');
    console.log(ProxyMultiVaultAlien_V3.code);
    console.log('');
};


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
