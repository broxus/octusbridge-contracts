import {setupBridge, setupRelays} from "../../../utils/bridge";
import {deployAccount} from "../../../utils/account";
import {logContract} from "../../../utils/logger";
import {setupNativeMultiVault} from "../../../utils/multivault/native";
import {deployTokenRoot, mintTokens} from "../../../utils/token";
import {Ed25519KeyPair} from "nekoton-wasm";
import {Contract, toNano} from "locklift";
import {
    BridgeAbi,
    CellEncoderStandaloneAbi,
    EthereumEverscaleEventConfigurationAbi,
    EverscaleEthereumEventConfigurationAbi,
    EverscaleSolanaEventConfigurationAbi, MediatorAbi,
    MultiVaultEverscaleEVMEventNativeAbi,
    MultiVaultEVMEverscaleEventAlienAbi,
    MultiVaultEVMEverscaleEventNativeAbi, ProxyMultiVaultAlien_V8Abi,
    ProxyMultiVaultNative_V6Abi,
    SolanaEverscaleEventConfigurationAbi,
    StakingMockupAbi,
    TokenRootAbi,
    TokenWalletAbi
} from "../../../../build/factorySource";
import {Account} from "everscale-standalone-client/nodejs";
import {MediatorOperation, setupHiddenBridge} from "../../../utils/hidden-bridge";
import {setupAlienMultiVault} from "../../../utils/multivault/alien";
import {EventAction, EventType, processEvent} from "../../../utils/events";
import {expect} from "chai";


const logger = require("mocha-logger");


let relays: Ed25519KeyPair[];
let bridge: Contract<BridgeAbi>;
let cellEncoder: Contract<CellEncoderStandaloneAbi>;
let staking: Contract<StakingMockupAbi>;
let bridgeOwner: Account;

let mediator: Contract<MediatorAbi>;

let alienEthereumEverscaleEventConfiguration: Contract<EthereumEverscaleEventConfigurationAbi>;
let alienEverscaleEthereumEventConfiguration: Contract<EverscaleEthereumEventConfigurationAbi>;
let alienSolanaEverscaleEventConfiguration: Contract<SolanaEverscaleEventConfigurationAbi>;
let alienEverscaleSolanaEventConfiguration: Contract<EverscaleSolanaEventConfigurationAbi>;
let alienProxy: Contract<ProxyMultiVaultAlien_V8Abi>;

let nativeEthereumEverscaleEventConfiguration: Contract<EthereumEverscaleEventConfigurationAbi>;
let nativeEverscaleEthereumEventConfiguration: Contract<EverscaleEthereumEventConfigurationAbi>;
let nativeSolanaEverscaleEventConfiguration: Contract<SolanaEverscaleEventConfigurationAbi>;
let nativeEverscaleSolanaEventConfiguration: Contract<EverscaleSolanaEventConfigurationAbi>;
let nativeProxy: Contract<ProxyMultiVaultNative_V6Abi>;

let initializer: Account;
let eventCloser: Account;

let tokenRoot: Contract<TokenRootAbi>;
let initializerTokenWallet: Contract<TokenWalletAbi>;


describe('Test EVM-EVM bridge transfers, deposit native withdraw native token', async function() {
    this.timeout(10000000);

    const tokenMeta = {
        name: 'Custom Giga Chad',
        symbol: 'CUSTOM_GIGA_CHAD',
        decimals: 9
    };


    const mintAmount = 1000;
    const amount = 500;


    it("Setup bridge", async () => {
        relays = await setupRelays();
        [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

        const signer = (await locklift.keystore.getSigner("0"))!;

        initializer = await deployAccount(signer, 50);

        await logContract("Initializer", initializer.address);

        [
            nativeEthereumEverscaleEventConfiguration,
            nativeEverscaleEthereumEventConfiguration,
            nativeSolanaEverscaleEventConfiguration,
            nativeEverscaleSolanaEventConfiguration,
            nativeProxy
        ] = await setupNativeMultiVault(bridgeOwner, staking);

        [
            alienEthereumEverscaleEventConfiguration,
            alienEverscaleEthereumEventConfiguration,
            alienSolanaEverscaleEventConfiguration,
            alienEverscaleSolanaEventConfiguration,
            alienProxy
        ] = await setupAlienMultiVault(bridgeOwner, staking);

        eventCloser = await deployAccount(
            (await locklift.keystore.getSigner("1"))!,
            50
        );
    });

    it('Deploy native token root', async () => {
        tokenRoot = await deployTokenRoot(
            tokenMeta.name,
            tokenMeta.symbol,
            tokenMeta.decimals,
            bridgeOwner.address
        );

        await logContract("Custom token root", tokenRoot.address);
    });

    it('Mint tokens to initializer', async () => {
        [initializerTokenWallet] = await mintTokens(
            bridgeOwner,
            [initializer],
            tokenRoot,
            mintAmount
        );
    });

    it('Setup mediator', async () => {
        [mediator] = await setupHiddenBridge(
            bridgeOwner,
            nativeProxy,
            alienProxy
        );

        await logContract('Mediator', mediator.address);
    });

    it('Send tokens to native proxy without notification', async () => {
        await initializerTokenWallet.methods.transfer({
            recipient: nativeProxy.address,
            deployWalletValue: toNano(0.1),
            amount,
            payload: '',
            notify: false,
            remainingGasTo: initializer.address
        }).send({
            from: initializer.address,
            amount: toNano(1)
        });
    });

    describe('Deposit native token, withdraw native token (eg WEVER ETH-BNB)', async () => {
        let depositEventContract: Contract<MultiVaultEVMEverscaleEventNativeAbi>;
        let withdrawEventContract: Contract<MultiVaultEverscaleEVMEventNativeAbi>;

        type EncodeMultiVaultAlienEVMEverscaleParam = Parameters<
            Contract<CellEncoderStandaloneAbi>["methods"]["encodeMultiVaultNativeEVMEverscale"]
            >[0];
        let eventDataStructure: EncodeMultiVaultAlienEVMEverscaleParam;

        type EventVoteDataParam = Parameters<
            Contract<EthereumEverscaleEventConfigurationAbi>["methods"]["deployEvent"]
            >[0]["eventVoteData"];
        let eventVoteData: EventVoteDataParam;

        let eventDataEncoded: string;

        const callback = {
            recipient: 123,
            strict: false,
            payload: ''
        };

        let payload: string;

        it('Build withdrawal payload', async () => {
            const nativeWithdrawalPayload = await cellEncoder.methods
                .encodeNativeTransferPayloadEthereum({
                    recipient: 123,
                    chainId: 1,
                    callback
                }).call().then((t) => t.value0);

            payload = await cellEncoder.methods
                .encodeMediatorPayload({
                    operation: MediatorOperation.TransferToNativeProxy,
                    proxy: nativeProxy.address,
                    payload: nativeWithdrawalPayload
                }).call().then(t => t.value0);
        });

        it('Deploy event contract (deposit)', async () => {
            eventDataStructure = {
                token_wid: tokenRoot.address.toString().split(":")[0],
                token_addr: `0x${tokenRoot.address.toString().split(":")[1]}`,

                amount: 333,
                recipient_wid: mediator.address.toString().split(":")[0],
                recipient_addr: `0x${mediator.address.toString().split(":")[1]}`,

                value: 10000,
                expected_evers: 1000,
                payload
            };

            eventDataEncoded = await cellEncoder.methods
                .encodeMultiVaultNativeEVMEverscale(eventDataStructure)
                .call()
                .then((t) => t.value0);

            eventVoteData = {
                eventTransaction: 111,
                eventIndex: 222,
                eventData: eventDataEncoded,
                eventBlockNumber: 333,
                eventBlock: 444,
            };

            const tx = await nativeEthereumEverscaleEventConfiguration.methods
                .deployEvent({
                    eventVoteData,
                })
                .send({
                    from: initializer.address,
                    amount: locklift.utils.toNano(10),
                });

            logger.log(`Event initialization tx: ${tx.id.hash}`);

            const expectedEventContract = await nativeEthereumEverscaleEventConfiguration.methods
                .deriveEventAddress({
                    eventVoteData: eventVoteData,
                    answerId: 0,
                })
                .call();

            logger.log(`Expected event: ${expectedEventContract.eventContract}`);

            depositEventContract = await locklift.factory.getDeployedContract(
                "MultiVaultEVMEverscaleEventNative",
                expectedEventContract.eventContract
            );
        });

        it('Confirm event', async () => {
            await processEvent(
                relays,
                depositEventContract.address,
                EventType.EthereumEverscale,
                EventAction.Confirm
            );
        });

        it('Check withdraw event contract deployed', async () => {
            const events = await nativeEverscaleEthereumEventConfiguration
                .getPastEvents({ filter: "NewEventContract" })
                .then((e) => e.events);

            expect(events).to.have.lengthOf(
                1,
                "Everscale event configuration failed to deploy event"
            );

            const [
                {
                    data: {
                        eventContract: expectedEventContract
                    },
                },
            ] = events;

            logger.log(`Expected event address: ${expectedEventContract}`);

            withdrawEventContract = await locklift.factory.getDeployedContract(
                "MultiVaultEverscaleEVMEventNative",
                expectedEventContract
            );
        });

        it('Check event contract nonce', async () => {
            const {
                nonce: depositNonce
            } = await depositEventContract.methods.nonce({}).call();

            const {
                nonce: withdrawNonce
            } = await withdrawEventContract.methods.nonce({}).call();

            expect(depositNonce)
                .to.be.equal(withdrawNonce, 'Wrong deposit and withdraw nonces');
        });

        it('Check withdraw event sender', async () => {
            const {
                sender
            } = await withdrawEventContract.methods.sender({}).call();

            expect(sender.toString())
                .to.be.equal(mediator.address.toString(), 'Withdraw sender should be mediator');
        });
    });
});
