import {Address} from "locklift";
import {logContract} from "../../test/utils/logger";
import {isValidTonAddress} from "../../test/utils";
import {ProxyMultiVaultNative_V6Abi} from "../../build/factorySource";
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
        }
    ]);

    const proxyMultiVaultNative = locklift.deployments.getContract<ProxyMultiVaultNative_V6Abi>('ProxyMultiVaultNative');

    const AlienTokenWalletPlatform = await locklift.factory.getContractArtifacts('AlienTokenWalletPlatform');
    const signer = (await locklift.keystore.getSigner("0"))!;

    const spinner = ora("Deploying mediator").start();

    const {
        contract: Mediator
    } = await locklift.factory.deployContract({
        contract: "Mediator_V2",
        constructorParams: {
            _owner: new Address(response.owner),
            _nativeProxy: proxyMultiVaultNative.address,
            _alienTokenWalletPlatformCode: AlienTokenWalletPlatform.code
        },
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce()
        },
        value: locklift.utils.toNano(120),
        publicKey: signer.publicKey
    });

    spinner.stop();

    await logContract('Mediator', Mediator.address);


    await locklift.deployments.saveContract({
        deploymentName: 'Mediator_V2',
        address: Mediator.address,
        contractName: 'Mediator_V2'
    });
}


main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e);
        process.exit(1);
    });
