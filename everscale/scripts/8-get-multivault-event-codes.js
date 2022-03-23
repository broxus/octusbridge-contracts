const main = async () => {
    const MultiVaultEVMEventNative = await locklift.factory.getContract('MultiVaultEVMEventNative');
    const MultiVaultEverscaleEventNative = await locklift.factory.getContract('MultiVaultEverscaleEventNative');

    const MultiVaultEVMEventAlien = await locklift.factory.getContract('MultiVaultEVMEventAlien');
    const MultiVaultEverscaleEventAlien = await locklift.factory.getContract('MultiVaultEverscaleEventAlien');

    for (const event of [MultiVaultEVMEventNative, MultiVaultEverscaleEventNative, MultiVaultEVMEventAlien, MultiVaultEverscaleEventAlien]) {
        console.log(event.name);
        console.log(event.code);
        console.log('');
    }
};


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
