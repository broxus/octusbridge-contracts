async function main() {
    const StakingV1_1 = await locklift.factory.getContract('StakingV1_2');
    console.log('\nStakingV1_2:\n');
    console.log(StakingV1_1.code, '\n');

    const NewRelayRound = await locklift.factory.getContract('RelayRound');
    console.log('RelayRound:\n');
    console.log(NewRelayRound.code, '\n');
}


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
