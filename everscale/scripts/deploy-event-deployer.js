const {logContract} = require("./../test/utils");

async function main() {
    const [keyPair] = await locklift.keys.getKeyPairs();

    const EventDeployer = await locklift.factory.getContract('EventDeployer');

    const eventDeployer = await locklift.giver.deployContract({
        contract: EventDeployer,
        constructorParams: {
            _guardian: '0:e02729e9be9ad07dea46caa6f77085975049b1a7678150b0a0808e4bb86426be',
            _owner: "0xd1f472c3f6b4ebe2b25a63280b0cacda9166801b2b7aa6f3004f68c586d64309"
        },
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce()
        },
        keyPair
    }, locklift.utils.convertCrystal(50, 'nano'));

    await logContract(eventDeployer);
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
