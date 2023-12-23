import {logContract} from "../test/utils/logger";
import {isValidTonAddress} from "../test/utils";

const prompts = require("prompts");
const ora = require("ora");


const main = async () => {
    const response = await prompts([
        {
            type: "text",
            name: "owner",
            message: "Proxies owner (can be changed later)",
            validate: (value: any) =>
                isValidTonAddress(value) ? true : "Invalid address",
        },
    ]);

    const _randomNonce = locklift.utils.getRandomNonce();

    const signer = (await locklift.keystore.getSigner("2"))!;

    const spinner = ora("Deploying alien proxy").start();

    // Deploy proxy
    const { contract: proxyAlien } = await locklift.factory.deployContract({
        contract: "ProxyMultiVaultAlien_V8",
        constructorParams: {
            owner_: response.owner,
        },
        initParams: {
            _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(15),
    });

    spinner.stop();

    await logContract("ProxyMultiVaultAlien_V8", proxyAlien.address);

    spinner.start("Deploy native proxy");

    // Deploy proxy
    const { contract: proxyNative } = await locklift.factory.deployContract({
        contract: "ProxyMultiVaultNative_V6",
        constructorParams: {
            owner_: response.owner,
        },
        initParams: {
            _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(15),
    });

    spinner.stop();

    await logContract("ProxyMultiVaultNative_V6", proxyNative.address);
}


main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e);
        process.exit(1);
    });
