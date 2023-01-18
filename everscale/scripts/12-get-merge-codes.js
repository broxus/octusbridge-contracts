const main = async () => {
    const MergePoolPlatform = await locklift.factory.getContract('MergePoolPlatform');
    const MergePool_V1 = await locklift.factory.getContract('MergePool_V1');
    const MergePool_V2 = await locklift.factory.getContract('MergePool_V2');
    const MergeRouter = await locklift.factory.getContract('MergeRouter');

    for (const contract of [MergePoolPlatform, MergePool_V1, MergePool_V2, MergeRouter]) {
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
