export {};

async function main() {
    const StakingV1_2 = await locklift.factory.getContractArtifacts('StakingV1_2');
    console.log('\nStakingV1_2:\n');
    console.log(StakingV1_2.code, '\n');

    const NewRelayRound = await locklift.factory.getContractArtifacts('RelayRound');
    console.log('RelayRound:\n');
    console.log(NewRelayRound.code, '\n');
}


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
