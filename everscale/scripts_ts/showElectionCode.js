
const main = async () => {
    const Election = await locklift.factory.getContract('Election');
    console.log('Election code:\n')
    console.log(Election.code);
};


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
