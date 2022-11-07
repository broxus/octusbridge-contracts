const main = async () => {
    const MultiVaultEVMEverscaleEventNative = await locklift.factory.getContract('MultiVaultEVMEverscaleEventNative');
    const MultiVaultEverscaleEVMEventNative = await locklift.factory.getContract('MultiVaultEverscaleEVMEventNative');

    const MultiVaultEVMEverscaleEventAlien = await locklift.factory.getContract('MultiVaultEVMEverscaleEventAlien');
    const MultiVaultEverscaleEVMEventAlien = await locklift.factory.getContract('MultiVaultEverscaleEVMEventAlien');

    for (const event of [MultiVaultEVMEverscaleEventNative, MultiVaultEverscaleEVMEventNative, MultiVaultEVMEverscaleEventAlien, MultiVaultEverscaleEVMEventAlien]) {
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
