import {Account} from "everscale-standalone-client/nodejs";
import {Address, Contract} from "locklift";
import {FactorySource} from "../../../build/factorySource";
import {logContract} from "../logger";


export const setupSolanaEverscaleEventConfiguration = async (
    owner: Account,
    staking: Contract<FactorySource["StakingMockup"]>,
    proxy: Address,
    eventCode: string
) => {
    const signer = (await locklift.keystore.getSigner("1"))!;

    const solanaEverscaleEventConfigurationData = locklift.factory.getContractArtifacts(
        "SolanaEverscaleEventConfiguration"
    );

    const { contract: factory } = await locklift.factory.deployContract({
        contract: "SolanaEverscaleEventConfigurationFactory",
        constructorParams: {
            _configurationCode: solanaEverscaleEventConfigurationData.code,
        },
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce(),
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(2),
    });

    const basicConfiguration = {
        eventABI: "",
        eventInitialBalance: locklift.utils.toNano(2),
        staking: staking.address,
        eventCode,
    };

    const networkConfiguration = {
        program: 0,
        proxy,
        startTimestamp: 0,
        endTimestamp: 0,
    };

    await factory.methods
        .deploy({
            _owner: owner.address,
            basicConfiguration,
            networkConfiguration,
        })
        .send({
            from: owner.address,
            amount: locklift.utils.toNano(20),
        });

    let solanaEverscaleEventConfigurationAddress = await factory.methods
        .deriveConfigurationAddress({
            basicConfiguration,
            networkConfiguration,
        })
        .call();

    const solanaEverscaleEventConfiguration =
        locklift.factory.getDeployedContract(
            "SolanaEverscaleEventConfiguration",
            solanaEverscaleEventConfigurationAddress.value0
        );

    await logContract(
        "SolanaEverscaleEventConfiguration",
        solanaEverscaleEventConfiguration.address
    );

    return solanaEverscaleEventConfiguration;
};


export const setupEverscaleSolanaEventConfiguration = async (
    owner: Account,
    staking: Contract<FactorySource["StakingMockup"]>,
    eventEmitter: Address,
    eventCode: string
) => {
    const signer = (await locklift.keystore.getSigner("1"))!;

    const everscaleSolanaEventConfigurationData = locklift.factory.getContractArtifacts(
        "EverscaleSolanaEventConfiguration"
    );

    const { contract: factory } = await locklift.factory.deployContract({
        contract: "EverscaleSolanaEventConfigurationFactory",
        constructorParams: {
            _configurationCode: everscaleSolanaEventConfigurationData.code,
        },
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce(),
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(2),
    });

    const everBasicConfiguration = {
        eventABI: "",
        eventInitialBalance: locklift.utils.toNano(2),
        staking: staking.address,
        eventCode,
    };

    const everNetworkConfiguration = {
        program: 0,
        eventEmitter,
        instruction: 0,
        executeInstruction: 0,
        executePayloadInstruction: 0,
        executeNeeded: false,
        startTimestamp: 0,
        endTimestamp: 0,
    };

    await factory.methods
        .deploy({
            _owner: owner.address,
            basicConfiguration: everBasicConfiguration,
            networkConfiguration: everNetworkConfiguration,
        })
        .send({
            from: owner.address,
            amount: locklift.utils.toNano(20),
        });

    let everscaleSolanaEventConfigurationAddress = await factory.methods
        .deriveConfigurationAddress({
            basicConfiguration: everBasicConfiguration,
            networkConfiguration: everNetworkConfiguration,
        })
        .call();

    const everscaleSolanaEventConfiguration = locklift.factory.getDeployedContract(
        "EverscaleSolanaEventConfiguration",
        everscaleSolanaEventConfigurationAddress.value0
    );

    await logContract(
        "EverscaleSolanaEventConfiguration",
        everscaleSolanaEventConfiguration.address
    );

    return everscaleSolanaEventConfiguration;
};
