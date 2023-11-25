import {logContract} from "../test/utils/logger";
import {isValidTonAddress, stringToBytesArray} from "../test/utils";
import {Contract} from "locklift";
import {SolanaEverscaleEventConfigurationFactoryAbi} from "../build/factorySource";

const prompts = require("prompts");
const ora = require("ora");


let factory: Contract<SolanaEverscaleEventConfigurationFactoryAbi>;

const main = async () => {
    const response = await prompts([
        {
            type: "text",
            name: "owner",
            message: "Bridge initial owner (can be changed later)",
            validate: (value: any) =>
                isValidTonAddress(value) ? true : "Invalid address",
        },
        {
            type: "text",
            name: "staking",
            message: "Staking contract",
            validate: (value: any) =>
                isValidTonAddress(value) ? true : "Invalid address",
        },
        {
            type: "text",
            name: "proxy",
            message: "Proxy contract",
            validate: (value: any) =>
                isValidTonAddress(value) ? true : "Invalid address",
        },
        {
            type: "text",
            name: "factory",
            message: "Configuration factory contract",
            validate: (value: any) =>
                isValidTonAddress(value) ? true : "Invalid address",
        },
        {
            type: "text",
            name: "program",
            message: "Solana program address",
        },
        {
            type: "number",
            name: "startTimestamp",
            initial: 0,
            message: "Start timestamp (in seconds)",
        },
        {
            type: "number",
            name: "endTimestamp",
            initial: 1700221576,
            message: "End timestamp (in seconds)",
        },
    ]);

    const spinner = ora("Deploying native solana ever event configuration").start();

    const solanaEverscaleEvent = locklift.factory.getContractArtifacts(
        "MultiVaultSolanaEverscaleEventNative"
    );

    factory = locklift.factory.getDeployedContract('SolanaEverscaleEventConfigurationFactory',
        response.factory,
    );

    const basicConfiguration = {
        eventABI: stringToBytesArray(JSON.stringify([{"name":"token","type":"address"},
            {"name":"amount","type":"uint128"},
            {"name":"recipient","type":"address"},
            {"name":"value","type":"uint64"},
            {"name":"expected_evers","type":"uint256"},
            {"name":"payload","type":"cell"}])),
        eventInitialBalance: locklift.utils.toNano(2),
        staking: response.staking,
        eventCode: solanaEverscaleEvent.code,
    };

    const networkConfiguration = {
        program: response.program,
        proxy: response.proxy,
        startTimestamp: response.startTimestamp,
        endTimestamp: response.endTimestamp,
    };

    await factory.methods
        .deploy({
            _owner: response.owner,
            basicConfiguration,
            networkConfiguration,
        })
        .send({
            from: response.owner,
            amount: locklift.utils.toNano(2),
        });

    let solanaEverscaleEventConfigurationAddress = await factory.methods
        .deriveConfigurationAddress({
            basicConfiguration,
            networkConfiguration,
        })
        .call();

    spinner.stop();

    await logContract("SolanaEverscaleEventConfiguration", solanaEverscaleEventConfigurationAddress.value0);

}


main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e);
        process.exit(1);
    });

