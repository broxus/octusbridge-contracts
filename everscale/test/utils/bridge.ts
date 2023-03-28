import {ed25519_generateKeyPair, Ed25519KeyPair} from "nekoton-wasm";
import {Address, Contract, WalletTypes} from "locklift";
import _ from "underscore";
import {Account} from "everscale-standalone-client/nodejs";
import {
    BridgeAbi,
    CellEncoderStandaloneAbi, EthereumEverscaleBaseEventAbi,
    FactorySource,
    StakingAbi,
    StakingMockupAbi
} from "../../build/factorySource";
import {logContract} from "./logger";
const logger = require("mocha-logger");
import {deployAccount} from "./account";


export const setupRelays = async (amount = 20) => {
    return Promise.all(
        _.range(amount).map(async () => ed25519_generateKeyPair())
    );
};


export const enableEventConfiguration = async (
    bridgeOwner: Account,
    bridge: Contract<FactorySource["Bridge"]>,
    eventConfiguration: Address
) => {
    const connectorId = await bridge.methods.connectorCounter().call();
    const connectorDeployValue = await bridge.methods
        .connectorDeployValue({})
        .call();

    await locklift.transactions.waitFinalized(
        bridge.methods
            .deployConnector({
                _eventConfiguration: eventConfiguration,
            })
            .send({
                from: bridgeOwner.address,
                amount: (
                    parseInt(connectorDeployValue.connectorDeployValue, 10) + 1000000000
                ).toString(),
            })
    );

    const connectorAddress = await bridge.methods
        .deriveConnectorAddress({
            id: connectorId.connectorCounter,
        })
        .call();

    const connector = await locklift.factory.getDeployedContract(
        "Connector",
        connectorAddress.connector
    );

    await locklift.transactions.waitFinalized(
        connector.methods.enable().send({
            from: bridgeOwner.address,
            amount: locklift.utils.toNano(0.5),
        })
    );
};


export const captureConnectors = async (bridge: Contract<FactorySource["Bridge"]>) => {
    const connectorCounter = await bridge.methods.connectorCounter().call();

    const configurations = await Promise.all(
        _.range(parseInt(connectorCounter.connectorCounter, 10)).map(
            async (connectorId: number) => {
                const connectorAddress = await bridge.methods
                    .deriveConnectorAddress({
                        id: connectorId,
                    })
                    .call();

                const connector = await locklift.factory.getDeployedContract(
                    "Connector",
                    connectorAddress.connector
                );

                return await connector.methods.getDetails({}).call();
            }
        )
    );

    return configurations.reduce((acc, configuration) => {
        return {
            ...acc,
            [configuration._id]: configuration,
        };
    }, {});
};


export const setupBridge = async (relays: Ed25519KeyPair[]): Promise<[
    Contract<BridgeAbi>,
    Account,
    Contract<StakingMockupAbi>,
    Contract<CellEncoderStandaloneAbi>
]> => {
    const signer = (await locklift.keystore.getSigner("0"))!;

    const _randomNonce = locklift.utils.getRandomNonce();

    const owner = await deployAccount(signer, 30);

    await logContract("Owner", owner.address);

    const { contract: staking } = await locklift.tracing.trace(
        locklift.factory.deployContract({
            contract: "StakingMockup",
            constructorParams: {},
            initParams: {
                _randomNonce,
                __keys: relays.map((r) => `0x${r.publicKey}`),
            },
            publicKey: signer.publicKey,
            value: locklift.utils.toNano(1),
        })
    );

    await logContract("Staking", staking.address);

    const connectorData = await locklift.factory.getContractArtifacts(
        "Connector"
    );

    const { contract: bridge } = await locklift.tracing.trace(
        locklift.factory.deployContract({
            contract: "Bridge",
            constructorParams: {
                _owner: owner.address,
                _manager: owner.address,
                _staking: staking.address,
                _connectorCode: connectorData.code,
                _connectorDeployValue: locklift.utils.toNano(1),
            },
            initParams: {
                _randomNonce: locklift.utils.getRandomNonce(),
            },
            publicKey: signer.publicKey,
            value: locklift.utils.toNano(2),
        })
    );

    await logContract("Bridge", bridge.address);

    const { contract: cellEncoder } = await locklift.factory.deployContract({
        contract: "CellEncoderStandalone",
        constructorParams: {},
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce(),
        },
        publicKey: signer?.publicKey as string,
        value: locklift.utils.toNano(1)
    });

    await logContract("CellEncoderStandalone", cellEncoder.address);

    return [bridge, owner, staking, cellEncoder];
};

