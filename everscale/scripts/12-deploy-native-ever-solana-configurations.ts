import {logContract} from "../test/utils/logger";
import {isValidTonAddress, stringToBytesArray} from "../test/utils";
import {Address, Contract} from "locklift";
import {EverscaleSolanaEventConfigurationFactoryAbi} from "../build/factorySource";
import BigNumber from "bignumber.js";
import { deployAccount } from "../test/utils/account";

const prompts = require("prompts");
const ora = require("ora");


let factory: Contract<EverscaleSolanaEventConfigurationFactoryAbi>;

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
        {
            type: "number",
            name: "instruction",
            initial: 0,
            message: "Vote instruction",
        },
        {
            type: "number",
            name: "executeInstruction",
            initial: 1,
            message: "Execute instruction",
        },
        {
            type: "number",
            name: "executePayloadInstruction",
            initial: 3,
            message: "Execute payload instruction",
        },
        {
            type: "boolean",
            name: "executeNeeded",
            initial: true,
            message: "Execute needed",
        },
    ]);

    const spinner = ora("Deploying native ever solana event configuration").start();

    const EverscaleSolanaEvent = locklift.factory.getContractArtifacts(
        "MultiVaultEverscaleSolanaEventNative"
    );

    factory = locklift.factory.getDeployedContract('EverscaleSolanaEventConfigurationFactory',
        response.factory,
    );

    const everBasicConfiguration = {
        eventABI: stringToBytesArray(JSON.stringify([
            {"name":"token","type":"address"},
            {"name":"name","type":"string"},
            {"name":"symbol","type":"string"},
            {"name":"decimals","type":"uint8"},
            {"name":"amount","type":"uint128"},
            {"name":"recipient","type":"uint256"},
            {"name":"payload","type":"bytes"}])),
        eventInitialBalance: locklift.utils.toNano(2),
        staking: response.staking,
        eventCode: EverscaleSolanaEvent.code ,
    };

    const everNetworkConfiguration = {
        program: response.program,
        eventEmitter: response.proxy,
        instruction: response.instruction, // vote
        executeInstruction: response.executeInstruction, // execute sol
        executePayloadInstruction: response.executePayloadInstruction, // execute sol
        executeNeeded: response.executeNeeded,
        startTimestamp: response.startTimestamp,
        endTimestamp: response.endTimestamp,
    };

    const signer = (await locklift.keystore.getSigner("0"))!;
    const admin = await deployAccount(signer, 3);

    await factory.methods
        .deploy({
            _owner: response.owner,
            basicConfiguration: everBasicConfiguration,
            networkConfiguration: everNetworkConfiguration,
        })
        .send({
            from: admin.address,
            amount: locklift.utils.toNano(2),
        });

    let EverscaleSolanaEventConfigurationAddress = await factory.methods
        .deriveConfigurationAddress({
            basicConfiguration: everBasicConfiguration,
            networkConfiguration: everNetworkConfiguration,
        })
        .call();

    spinner.stop();

    await logContract("EverscaleSolanaEventConfiguration", EverscaleSolanaEventConfigurationAddress.value0);

}


main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e);
        process.exit(1);
    });

