const main = async () => {
    const MergePoolPlatform = await locklift.factory.getContract('MergePoolPlatform');
    const MergePool = await locklift.factory.getContract('MergePool');
    const MergeRouter = await locklift.factory.getContract('MergeRouter');

    for (const contract of [MergePoolPlatform, MergePool, MergeRouter]) {
        console.log(contract.name);
        console.log(contract.code);
        console.log('');
    }
}


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
