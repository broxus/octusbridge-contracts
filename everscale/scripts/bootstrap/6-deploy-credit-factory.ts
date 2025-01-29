import { Address, getRandomNonce, toNano } from "locklift";

const main = async () => {
    const key =
        "0x2651a72372046434af0e752205b6ad50b31c9498d9072ce793156af1d1754862";
    const owner =
        "0:60b6a00f4abf2e9c6cd04ad5ebd383e9a219367d67fab85464f5c5a4a2e13c33";

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
                eventClosersCount: 1,
                eventDeployersCount: 1
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

    const { eventClosers } = await creditFactory.methods.eventClosers().call();

    for (let i = 0; i < eventClosers.length; i++) {
        await locklift.deployments.saveContract({
            deploymentName: `EventCloser-${(i + 1)}`,
            address: eventClosers[i],
            contractName: 'EventCloser'
        });
        console.log(`EventCloser ${(i + 1)}: ${eventClosers[i].toString()}`);
    }

    const { eventDeployers } = await creditFactory.methods.eventDeployers().call();

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
