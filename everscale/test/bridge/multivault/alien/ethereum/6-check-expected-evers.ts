import {setupBridge, setupRelays} from "../../../../utils/bridge";
import {deployAccount} from "../../../../utils/account";
import {logContract} from "../../../../utils/logger";
import {setupAlienMultiVault} from "../../../../utils/multivault/alien";
import {Ed25519KeyPair} from "nekoton-wasm";
import {Contract, zeroAddress} from "locklift";
import {
    BridgeAbi,
    CellEncoderStandaloneAbi,
    EthereumEverscaleEventConfigurationAbi,
    EverscaleEthereumEventConfigurationAbi,
    EverscaleSolanaEventConfigurationAbi,
    MultiVaultEVMEverscaleEventAlienAbi,
    ProxyMultiVaultAlien_V7Abi,
    SolanaEverscaleEventConfigurationAbi,
    StakingMockupAbi
} from "../../../../../build/factorySource";
import {Account} from "everscale-standalone-client/nodejs";
import {expect} from "chai";
import {EventAction, EventType, processEvent} from "../../../../utils/events";
import BigNumber from "bignumber.js";

const logger = require("mocha-logger");

let relays: Ed25519KeyPair[];
let bridge: Contract<BridgeAbi>;
let cellEncoder: Contract<CellEncoderStandaloneAbi>;
let staking: Contract<StakingMockupAbi>;
let bridgeOwner: Account;

let ethereumEverscaleEventConfiguration: Contract<EthereumEverscaleEventConfigurationAbi>;
let everscaleEthereumEventConfiguration: Contract<EverscaleEthereumEventConfigurationAbi>;
let solanaEverscaleEventConfiguration: Contract<SolanaEverscaleEventConfigurationAbi>;
let everscaleSolanaEventConfiguration: Contract<EverscaleSolanaEventConfigurationAbi>;
let initializer: Account;
let proxy: Contract<ProxyMultiVaultAlien_V7Abi>;


let eventContract: Contract<MultiVaultEVMEverscaleEventAlienAbi>;

type EncodeMultiVaultAlienEVMEverscaleParam = Parameters<
    Contract<CellEncoderStandaloneAbi>["methods"]["encodeMultiVaultAlienEVMEverscale"]
    >[0];
let eventDataStructure: EncodeMultiVaultAlienEVMEverscaleParam;

type EventVoteDataParam = Parameters<
    Contract<EthereumEverscaleEventConfigurationAbi>["methods"]["deployEvent"]
    >[0]["eventVoteData"];
let eventVoteData: EventVoteDataParam;

let eventDataEncoded: string;


describe('Check expected_evers constraint on event deployment', async function() {
    this.timeout(10000000);

    const alienTokenBase = {
        chainId: 111,
        token: 222,
    };

    const tokenMeta = {
        name: 'Giga Chad',
        symbol: 'GIGA_CHAD',
        decimals: 6,
    };

    const expected_evers = locklift.utils.toNano(30);

    it("Setup bridge", async () => {
        relays = await setupRelays();
        [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

        const signer = (await locklift.keystore.getSigner("0"))!;

        initializer = await deployAccount(signer, 50);

        await logContract("Initializer", initializer.address);

        [
            ethereumEverscaleEventConfiguration,
            everscaleEthereumEventConfiguration,
            solanaEverscaleEventConfiguration,
            everscaleSolanaEventConfiguration,
            proxy
        ] = await setupAlienMultiVault(bridgeOwner, staking);
    });

    describe('Deploy event contract with less EVERs than required', async () => {
        it('Initialize event', async () => {
            eventDataStructure = {
                base_chainId: alienTokenBase.chainId,
                base_token: alienTokenBase.token,
                ...tokenMeta,

                amount: 333,
                recipient_wid: initializer.address.toString().split(":")[0],
                recipient_addr: `0x${initializer.address.toString().split(":")[1]}`,

                value: 10000,
                expected_evers,
                payload: ''
            };

            eventDataEncoded = await cellEncoder.methods
                .encodeMultiVaultAlienEVMEverscale(eventDataStructure)
                .call()
                .then((t) => t.value0);

            eventVoteData = {
                eventTransaction: 111,
                eventIndex: 222,
                eventData: eventDataEncoded,
                eventBlockNumber: 333,
                eventBlock: 444,
            };

            // const tx = await locklift.tracing.trace(ethereumEverscaleEventConfiguration.methods
            //     .deployEvent({
            //         eventVoteData,
            //     })
            //     .send({
            //         from: initializer.address,
            //         amount: locklift.utils.toNano(6),
            //     }));

            const tx = await ethereumEverscaleEventConfiguration.methods
                .deployEvent({
                    eventVoteData,
                })
                .send({
                    from: initializer.address,
                    amount: new BigNumber(expected_evers).div(2).toString(),
                });

            logger.log(`Event initialization tx: ${tx.id}`);

            const expectedEventContract = await ethereumEverscaleEventConfiguration.methods
                .deriveEventAddress({
                    eventVoteData: eventVoteData,
                    answerId: 0,
                })
                .call();

            logger.log(`Expected event: ${expectedEventContract.eventContract}`);

            eventContract = await locklift.factory.getDeployedContract(
                "MultiVaultEVMEverscaleEventAlien",
                expectedEventContract.eventContract
            );
        });

        it("Check event contract not exists", async () => {
            expect(
                Number(await locklift.provider.getBalance(eventContract.address))
            ).to.be.equal(0, "Event contract balance is zero");
        });
    });

    describe('Initialize event contract with enough evers', async () => {
        it('Initialize event', async () => {
            eventDataStructure = {
                base_chainId: alienTokenBase.chainId,
                base_token: alienTokenBase.token,
                ...tokenMeta,

                amount: 333,
                recipient_wid: initializer.address.toString().split(":")[0],
                recipient_addr: `0x${initializer.address.toString().split(":")[1]}`,

                value: 10000,
                expected_evers,
                payload: ''
            };

            eventDataEncoded = await cellEncoder.methods
                .encodeMultiVaultAlienEVMEverscale(eventDataStructure)
                .call()
                .then((t) => t.value0);

            eventVoteData = {
                eventTransaction: 111,
                eventIndex: 222,
                eventData: eventDataEncoded,
                eventBlockNumber: 333,
                eventBlock: 444,
            };

            // const tx = await locklift.tracing.trace(ethereumEverscaleEventConfiguration.methods
            //     .deployEvent({
            //         eventVoteData,
            //     })
            //     .send({
            //         from: initializer.address,
            //         amount: locklift.utils.toNano(6),
            //     }));

            const tx = await ethereumEverscaleEventConfiguration.methods
                .deployEvent({
                    eventVoteData,
                })
                .send({
                    from: initializer.address,
                    amount: new BigNumber(expected_evers).plus(locklift.utils.toNano(1)).toString(),
                });

            logger.log(`Event initialization tx: ${tx.id}`);

            const expectedEventContract = await ethereumEverscaleEventConfiguration.methods
                .deriveEventAddress({
                    eventVoteData: eventVoteData,
                    answerId: 0,
                })
                .call();

            logger.log(`Expected event: ${expectedEventContract.eventContract}`);

            eventContract = await locklift.factory.getDeployedContract(
                "MultiVaultEVMEverscaleEventAlien",
                expectedEventContract.eventContract
            );
        });

        it("Check event contract exists", async () => {
            expect(
                Number(await locklift.provider.getBalance(eventContract.address))
            ).to.be.greaterThan(0, "Event contract balance is zero");
        });

        it("Check event state", async () => {
            const details = await eventContract.methods
                .getDetails({ answerId: 0 })
                .call();

            expect(details._eventInitData.voteData.eventTransaction.toString()).to.be.equal(
                eventVoteData.eventTransaction.toString(),
                "Wrong event transaction"
            );
        });
    });
});
