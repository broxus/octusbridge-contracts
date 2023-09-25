import { Address, getRandomNonce, toNano } from "locklift";

const main = async () => {
    const key = '0xbc19d15b1b681d3a2d6fcc81188e271314f0355af5f03fc8c114f5437dfadd4a';
    const owner = '0:e02729e9be9ad07dea46caa6f77085975049b1a7678150b0a0808e4bb86426be';

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
            value: toNano(100)
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