import {logContract} from "../test/utils/logger";
import {isValidTonAddress, stringToBytesArray} from "../test/utils";
import {Contract} from "locklift";
import {
    EthereumEverscaleEventConfigurationFactoryAbi
} from "../build/factorySource";
import { deployAccount } from "../test/utils/account";
import BigNumber from "bignumber.js";

const prompts = require("prompts");
const ora = require("ora");


let factory: Contract<EthereumEverscaleEventConfigurationFactoryAbi>;

const main = async () => {
    const response = await prompts([
        {
            type: "text",
            name: "factory",
            message: "Configuration factory contract",
            validate: (value: any) =>
                isValidTonAddress(value) ? true : "Invalid address",
        },
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
            type: "number",
            name: "chainId",
            message: "Chain id",
        },
        {
            type: "text",
            name: "eventEmitter",
            message: "Evm multivault address (hex)",
        },
        {
            type: "number",
            name: "eventBlocksToConfirm",
            message: "Event blocks required for confirmation",
        },
        {
            type: "text",
            name: "proxy",
            message: "Proxy contract",
            validate: (value: any) =>
                isValidTonAddress(value) ? true : "Invalid address",
        },
        {
            type: "number",
            name: "flags",
            message: "Event configuration flags ",
        },
        {
            type: "number",
            name: "startBlockNumber",
            message: "Start block number",
        },
        {
            type: "number",
            name: "endBlockNumber",
            initial: 0,
            message: "End block number",
        },
    ]);

    const spinner = ora("Deploying native evm ever event configuration").start();

    const evmEverscaleEvent = locklift.factory.getContractArtifacts(
        "MultiVaultEVMEverscaleEventNative"
    );

    factory = locklift.factory.getDeployedContract('EthereumEverscaleEventConfigurationFactory',
        response.factory,
    );

    const basicConfiguration = {
        eventABI: stringToBytesArray(JSON.stringify({
            "anonymous":false,"inputs": [
                {"indexed":false,"internalType":"int8","name":"native_wid","type":"int8"},
                {"indexed":false,"internalType":"uint256","name":"native_addr","type":"uint256"},
                {"indexed":false,"internalType":"uint128","name":"amount","type":"uint128"},
                {"indexed":false,"internalType":"int8","name":"recipient_wid","type":"int8"},
                {"indexed":false,"internalType":"uint256","name":"recipient_addr","type":"uint256"},
                {"indexed":false,"internalType":"uint256","name":"value","type":"uint256"},
                {"indexed":false,"internalType":"uint256","name":"expected_evers","type":"uint256"},
                {"indexed":false,"internalType":"bytes","name":"payload","type":"bytes"}
            ],
            "name":"NativeTransfer",
            "type":"event"
        })),
        eventInitialBalance: locklift.utils.toNano(2),
        staking: response.staking,
        eventCode: evmEverscaleEvent.code,
    };

    const networkConfiguration = {
        chainId: response.chainId,
        eventEmitter: response.eventEmitter,
        eventBlocksToConfirm: response.eventBlocksToConfirm,
        proxy: response.proxy,
        startBlockNumber: response.startBlockNumber,
        endBlockNumber: response.endBlockNumber,
    };

    const signer = (await locklift.keystore.getSigner("0"))!;
    const admin = await deployAccount(signer, 3);

    await factory.methods
        .deploy({
            _owner: response.owner,
            _flags: response.flags,
            basicConfiguration,
            networkConfiguration,
        })
        .send({
            from: admin.address,
            amount: locklift.utils.toNano(2),
        });

    let evmEverscaleEventConfigurationAddress = await factory.methods
        .deriveConfigurationAddress({
            basicConfiguration,
            networkConfiguration,
        })
        .call();

    spinner.stop();

    await logContract("EthereumEverscaleEventConfiguration", evmEverscaleEventConfigurationAddress.value0);
}


main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e);
        process.exit(1);
    });

