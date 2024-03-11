import {Address} from "locklift";
import {logContract} from "../test/utils/logger";
import {isValidTonAddress} from "../test/utils";
const prompts = require("prompts");
const ora = require("ora");


const main = async () => {
    const response = await prompts([
        {
            type: "text",
            name: "owner",
            message: "Contracts owner address",
            validate: (value: any) =>
                isValidTonAddress(value) ? true : "Invalid address",
        },
        {
            type: "text",
            name: "nativeProxy",
            message: "Native proxy address",
            validate: (value: any) =>
                isValidTonAddress(value) ? true : "Invalid address",
        },
        {
            type: "text",
            name: "key",
            message: "Backend public key",
        }
    ]);

    const AlienTokenWalletPlatform = await locklift.factory.getContractArtifacts('AlienTokenWalletPlatform');
    const signer = (await locklift.keystore.getSigner("0"))!;

    const spinner = ora("Deploying mediator").start();

    const {
        contract: Mediator
    } = await locklift.factory.deployContract({
        contract: "Mediator_V2",
        constructorParams: {
            _owner: new Address(response.owner),
            _nativeProxy: new Address(response.nativeProxy),
            _alienTokenWalletPlatformCode: AlienTokenWalletPlatform.code
        },
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce()
        },
        value: locklift.utils.toNano(2),
        publicKey: signer.publicKey
    });

    spinner.stop();

    await logContract('Mediator', Mediator.address);

    // spinner.start('Deploying event deployer');

    // const {
    //     contract: EventDeployer
    // } = await locklift.factory.deployContract({
    //     contract: 'EventDeployer',
    //     constructorParams: {
    //         _guardian: new Address(response.owner),
    //         _owner: response.key
    //     },
    //     initParams: {
    //         _randomNonce: locklift.utils.getRandomNonce()
    //     },
    //     value: locklift.utils.toNano(15),
    //     publicKey: signer.publicKey
    // });

    // spinner.stop();

    // await logContract('EventDeployer', EventDeployer.address);

    // spinner.start('Deploying event closer');

    // const {
    //     contract: EventCloser
    // } = await locklift.factory.deployContract({
    //     contract: 'EventCloser',
    //     constructorParams: {
    //         _owner: response.key,
    //         _deployer: EventDeployer.address
    //     },
    //     initParams: {
    //         _randomNonce: locklift.utils.getRandomNonce()
    //     },
    //     value: locklift.utils.toNano(15),
    //     publicKey: signer.publicKey
    // });

    // spinner.stop();

    // await logContract('EventCloser', EventCloser.address);
}


main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e);
        process.exit(1);
    });
