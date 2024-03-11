import { Address, getRandomNonce, toNano } from "locklift";

const main = async () => {
    const key = '0x9c9565a37e90ac15fd574726162c46c212b4d34259c9b0e5a452cd591bb77d89';
    const owner = '0:42387b9e0c9ac80b4ac3228e560b9be87540bc1ff5c516265fb51e5a36ef4286';

    const EventCloser = await locklift.factory.getContractArtifacts('EventCloser');
    const EventDeployer = await locklift.factory.getContractArtifacts('EventDeployer');

    const signer = (await locklift.keystore.getSigner("0"))!;

    const {
        contract
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
            value: toNano(50)
        })
    );

    console.log(`Event credit factory: ${contract.address}`);
}


main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });