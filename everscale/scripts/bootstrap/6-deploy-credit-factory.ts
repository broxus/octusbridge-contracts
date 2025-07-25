import {Address, getRandomNonce, toNano} from "locklift";

const main = async () => {
    const key =
        "0x9fa323a12eed65d2ffb2bf2efe0674d4da1b5372ae3a9433043c452640c73938";
    const owner =
        "0:387caecd8624b1ef095cd68595f0370fc6ed820ccd55913a4c7c736b800e2b3e";

    const EventCloser = locklift.factory.getContractArtifacts('EventCloser');
    const EventDeployer = locklift.factory.getContractArtifacts('EventDeployer');

    const signer = (await locklift.keystore.getSigner("0"))!;

    const {
        contract: creditFactory
    } = await locklift.tracing.trace(
        locklift.factory.deployContract({
            contract: 'EventCreditFactory',
            constructorParams: {
                owner_: new Address(owner),
                key_: key,
                eventCloserCode_: EventCloser.code,
                eventDeployerCode_: EventDeployer.code,
                eventClosersCount: 2,
                eventDeployersCount: 2
            },
            initParams: {
                _randomNonce: getRandomNonce()
            },
            publicKey: signer.publicKey,
            value: toNano(300)
        })
    );

    console.log(`Event credit factory: ${creditFactory.address}`);

    await locklift.deployments.saveContract({
        deploymentName: 'EventCreditFactory',
        address: creditFactory.address,
        contractName: 'EventCreditFactory'
    });

    const {eventClosers} = await creditFactory.methods.eventClosers().call();

    for (let i = 0; i < eventClosers.length; i++) {
        await locklift.deployments.saveContract({
            deploymentName: `EventCloser-${(i + 1)}`,
            address: eventClosers[i],
            contractName: 'EventCloser'
        });
        console.log(`EventCloser ${(i + 1)}: ${eventClosers[i].toString()}`);
    }

    const {eventDeployers} = await creditFactory.methods.eventDeployers().call();

    for (let i = 0; i < eventDeployers.length; i++) {
        await locklift.deployments.saveContract({
            deploymentName: `EventDeployer-${(i + 1)}`,
            address: eventDeployers[i],
            contractName: 'EventDeployer'
        });
        console.log(`EventDeployer ${(i + 1)}: ${eventDeployers[i].toString()}`);
    }
}


main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e);
        process.exit(1);
    });
