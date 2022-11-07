const main = async () => {
    const ProxyMultiVaultEthereumNative = await locklift.factory.getContract('ProxyMultiVaultEthereumNative');
    const ProxyMultiVaultEthereumAlien = await locklift.factory.getContract('ProxyMultiVaultEthereumAlien');

    for (const contract of [ProxyMultiVaultEthereumNative, ProxyMultiVaultEthereumAlien]) {
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
