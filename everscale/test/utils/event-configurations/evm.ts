import {Account} from "everscale-standalone-client/nodejs";
import {Address, Contract} from "locklift";
import {FactorySource} from "../../../build/factorySource";
import {logContract} from "../logger";


export const setupEthereumEverscaleEventConfiguration = async (
    owner: Account,
    staking: Contract<FactorySource["StakingMockup"]>,
    proxy: Address,
    eventCode: string
) => {
    const signer = (await locklift.keystore.getSigner("10"))!;

    const {
        contract: ethereumEverscaleEventConfiguration
    } = await locklift.factory.deployContract({
        contract: "EthereumEverscaleEventConfiguration",
        constructorParams: {
            _owner: owner.address,
            _flags: 0,
            _meta: "",
        },
        initParams: {
            basicConfiguration: {
                eventABI: "",
                eventInitialBalance: locklift.utils.toNano(2),
                staking: staking.address,
                eventCode,
            },
            networkConfiguration: {
                chainId: 1,
                eventEmitter: 0,
                eventBlocksToConfirm: 1,
                proxy,
                startBlockNumber: 0,
                endBlockNumber: 0,
            },
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(20),
    });

    await logContract(
        "EthereumEverscaleEventConfiguration",
        ethereumEverscaleEventConfiguration.address
    );

    return ethereumEverscaleEventConfiguration;
};


export const setupEverscaleEthereumEventConfiguration = async (
    owner: Account,
    staking: Contract<FactorySource["StakingMockup"]>,
    eventEmitter: Address,
    eventCode: string
) => {
    const signer = (await locklift.keystore.getSigner("1"))!;

    const {
        contract: everscaleEthereumEventConfiguration
    } = await locklift.factory.deployContract({
        contract: "EverscaleEthereumEventConfiguration",
        constructorParams: {
            _owner: owner.address,
            _flags: 0,
            _meta: "",
        },
        initParams: {
            basicConfiguration: {
                eventABI: "",
                eventInitialBalance: locklift.utils.toNano(2),
                staking: staking.address,
                eventCode,
            },
            networkConfiguration: {
                eventEmitter,
                proxy: 0,
                startTimestamp: 0,
                endTimestamp: 0,
            },
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(2),
    });

    await logContract(
        "EverscaleEthereumEventConfiguration",
        everscaleEthereumEventConfiguration.address
    );

    return everscaleEthereumEventConfiguration;
};
