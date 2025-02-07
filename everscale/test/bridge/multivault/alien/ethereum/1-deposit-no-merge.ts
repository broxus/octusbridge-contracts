import {Contract, zeroAddress} from "locklift";
import {
    AlienTokenWalletUpgradeableAbi,
    BridgeAbi,
    CellEncoderStandaloneAbi,
    EthereumEverscaleEventConfigurationAbi,
    EverscaleEthereumEventConfigurationAbi,
    EverscaleSolanaEventConfigurationAbi,
    MergeRouterAbi,
    MultiVaultEVMEverscaleEventAlienAbi,
    ProxyMultiVaultAlien_V8Abi,
    SolanaEverscaleEventConfigurationAbi,
    StakingMockupAbi,
    TokenRootAlienEVMAbi
} from "../../../../../build/factorySource";
import {Account} from "everscale-standalone-client/nodejs";
import {Ed25519KeyPair} from "nekoton-wasm";
import {setupBridge, setupRelays} from "../../../../utils/bridge";
import {setupAlienMultiVault} from "../../../../utils/multivault/alien";
import {expect} from "chai";
import {deployAccount} from "../../../../utils/account";
import {logContract} from "../../../../utils/logger";
import {EventAction, EventType, processEvent} from "../../../../utils/events";

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
let proxy: Contract<ProxyMultiVaultAlien_V8Abi>;

let alienTokenRoot: Contract<TokenRootAlienEVMAbi>;
let mergeRouter: Contract<MergeRouterAbi>;
let initializerAlienTokenWallet: Contract<AlienTokenWalletUpgradeableAbi>;


describe('Deposit Alien token to Everscale with no merging', async function() {
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

    describe('Transfer alien token from EVM to Everscale', async () => {
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

        it('Initialize event', async () => {
            eventDataStructure = {
                base_chainId: alienTokenBase.chainId,
                base_token: alienTokenBase.token,
                ...tokenMeta,

                amount: 333,
                recipient_wid: initializer.address.toString().split(":")[0],
                recipient_addr: `0x${initializer.address.toString().split(":")[1]}`,

                value: 10000,
                expected_evers: 1000,
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
            //         amount: locklift.utils.toNano(8),
            //     }));

            const tx = await ethereumEverscaleEventConfiguration.methods
                .deployEvent({
                    eventVoteData,
                })
                .send({
                    from: initializer.address,
                    amount: locklift.utils.toNano(60),
                });

            logger.log(`Event initialization tx: ${tx.id}`);

            const expectedEventContract = await ethereumEverscaleEventConfiguration.methods
                .deriveEventAddress({
                    eventVoteData: eventVoteData,
                    answerId: 0,
                })
                .call({ responsible: true });

            logger.log(`Expected event: ${expectedEventContract.eventContract}`);

            eventContract = locklift.factory.getDeployedContract(
                "MultiVaultEVMEverscaleEventAlien",
                expectedEventContract.eventContract
            );
        });

        it("Check event contract exists", async () => {
            expect(
                Number(await locklift.provider.getBalance(eventContract.address))
            ).to.be.greaterThan(0, "Event contract balance is zero");
        });

        it("Check event state before confirmation", async () => {
            const details = await eventContract.methods
                .getDetails({ answerId: 0 })
                .call({ responsible: true });

            expect(details._eventInitData.voteData.eventTransaction.toString()).to.be.equal(
                eventVoteData.eventTransaction.toString(),
                "Wrong event transaction"
            );

            expect(details._eventInitData.voteData.eventIndex.toString()).to.be.equal(
                eventVoteData.eventIndex.toString(),
                "Wrong event index"
            );

            expect(details._eventInitData.voteData.eventData).to.be.equal(
                eventVoteData.eventData,
                "Wrong event data"
            );

            expect(
                details._eventInitData.voteData.eventBlockNumber.toString()
            ).to.be.equal(
                eventVoteData.eventBlockNumber.toString(),
                "Wrong event block number"
            );

            expect(details._eventInitData.voteData.eventBlock.toString()).to.be.equal(
                eventVoteData.eventBlock.toString(),
                "Wrong event block"
            );

            expect(details._eventInitData.configuration.toString()).to.be.equal(
                ethereumEverscaleEventConfiguration.address.toString(),
                "Wrong event configuration"
            );

            expect(details._eventInitData.staking.toString()).to.be.equal(
                staking.address.toString(),
                "Wrong staking"
            );

            expect(details._status).to.be.equal("1", "Wrong status");

            expect(details._confirms).to.have.lengthOf(
                0,
                "Wrong amount of relays confirmations"
            );

            expect(details._rejects).to.have.lengthOf(
                0,
                "Wrong amount of relays rejects"
            );

            expect(details._initializer.toString()).to.be.equal(
                initializer.address.toString(),
                "Wrong initializer"
            );
        });

        it("Check event initialization pipeline passed", async () => {
            const decodedData = await eventContract.methods
                .getDecodedData({ answerId: 0 })
                .call({ responsible: true });

            expect(decodedData.proxy_).to.not.be.equal(
                zeroAddress.toString(),
                "Event contract failed to fetch the proxy"
            );
            expect(decodedData.token_).to.not.be.equal(
                zeroAddress.toString(),
                "Event contract failed to fetch the token"
            );
        });

        it('Fetch alien token', async () => {
            const tokenAddress = await proxy.methods
                .deriveEVMAlienTokenRoot({
                    answerId: 0,
                    chainId: eventDataStructure.base_chainId,
                    token: eventDataStructure.base_token,
                    name: eventDataStructure.name,
                    symbol: eventDataStructure.symbol,
                    decimals: eventDataStructure.decimals,
                })
                .call({ responsible: true });

            alienTokenRoot = locklift.factory.getDeployedContract(
                'TokenRootAlienEVM',
                tokenAddress.value0
            );

            await logContract("Alien token root", alienTokenRoot.address);
        });

        it('Check alien token root exists', async () => {
            expect(
                Number(await locklift.provider.getBalance(alienTokenRoot.address))
            ).to.be.greaterThan(0, "Alien token root balance is zero");
        });

        it('Check alien token root meta', async () => {
            const meta = await alienTokenRoot.methods
                .meta({ answerId: 0 })
                .call({ responsible: true });

            expect(meta.base_chainId)
                .to.be.equal(eventDataStructure.base_chainId.toString(), 'Wrong alien token base chain id');
            expect(meta.base_token)
                .to.be.equal(eventDataStructure.base_token.toString(), 'Wrong alien token base token');
            expect(meta.name)
                .to.be.equal(eventDataStructure.name, 'Wrong alien token name');
            expect(meta.symbol)
                .to.be.equal(eventDataStructure.symbol, 'Wrong alien token symbol');
            expect(meta.decimals)
                .to.be.equal(eventDataStructure.decimals.toString(), 'Wrong alien token decimals');

            expect(
                await alienTokenRoot.methods
                    .rootOwner({ answerId: 0 })
                    .call({ responsible: true })
                    .then(t => t.value0.toString())
            ).to.be.equal(proxy.address.toString(), 'Wrong alien token owner');
        });

        it('Fetch merge router', async () => {
            const mergeRouterAddress = await proxy.methods
                .deriveMergeRouter({
                    token: alienTokenRoot.address,
                    answerId: 0
                })
                .call({ responsible: true });

            mergeRouter = locklift.factory.getDeployedContract(
                'MergeRouter',
                mergeRouterAddress.router
            );

            await logContract("Merge router", mergeRouter.address);
        });

        it('Check merge router exists', async () => {
            expect(
                Number(await locklift.provider.getBalance(mergeRouter.address))
            ).to.be.greaterThan(0, "Merge router balance is zero");
        });

        it('Check merge router data', async () => {
            const details = await mergeRouter.methods
                .getDetails({ answerId: 0 })
                .call({ responsible: true });

            expect(details._proxy.toString())
                .to.be.equal(proxy.address.toString(), 'Wrong proxy address in merge router');
            expect(details._token.toString())
                .to.be.equal(alienTokenRoot.address.toString(), 'Wrong token address in merge router');
            expect(details._pool.toString())
                .to.be.equal(zeroAddress.toString(), 'Wrong pool address in merge router');

            expect(await mergeRouter.methods.owner().call().then(t => t.owner.toString()))
                .to.be.equal(
                    await proxy.methods.owner().call().then(t => t.owner.toString()),
                'Wrong router owner'
            );
            expect(await mergeRouter.methods.manager().call().then(t => t.manager.toString()))
                .to.be.equal(
                    await proxy.methods.manager().call().then(t => t.manager.toString()),
                'Wrong router manager'
            );
        });

        it("Check event required votes", async () => {
            const requiredVotes = await eventContract.methods
                .requiredVotes()
                .call()
                .then((t) => parseInt(t.requiredVotes, 10));

            const relays = await eventContract.methods
                .getVoters({
                    vote: 1,
                    answerId: 0,
                })
                .call({ responsible: true });

            expect(requiredVotes).to.be.greaterThan(
                0,
                "Too low required votes for event"
            );
            expect(relays.voters.length).to.be.greaterThanOrEqual(
                requiredVotes,
                "Too many required votes for event"
            );
        });

        it("Check event round number", async () => {
            const roundNumber = await eventContract.methods.round_number({}).call();

            expect(parseInt(roundNumber.round_number, 10)).to.be.equal(
                0,
                "Wrong round number"
            );
        });

        describe('Confirm event', async () => {
            it("Confirm event enough times", async () => {
                await processEvent(
                    relays,
                    eventContract.address,
                    EventType.EthereumEverscale,
                    EventAction.Confirm
                );
            });

            it("Check event confirmed", async () => {
                const details = await eventContract.methods
                    .getDetails({ answerId: 0 })
                    .call({ responsible: true });

                const requiredVotes = await eventContract.methods
                    .requiredVotes()
                    .call()
                    .then((t) => parseInt(t.requiredVotes, 10));

                expect(details._status).to.be.equal("2", "Wrong status");

                expect(details._confirms).to.have.lengthOf(
                    requiredVotes,
                    "Wrong amount of relays confirmations"
                );

                expect(details._rejects).to.have.lengthOf(
                    0,
                    "Wrong amount of relays rejects"
                );
            });

            it('Check total supply', async () => {
                const totalSupply = await alienTokenRoot.methods
                    .totalSupply({ answerId: 0 })
                    .call({ responsible: true });

                expect(Number(totalSupply.value0))
                    .to.be.equal(eventDataStructure.amount, 'Wrong total supply');
            });

            it('Check initializer token wallet exists', async () => {
                const walletAddress = await alienTokenRoot.methods
                    .walletOf({
                        walletOwner: initializer.address,
                        answerId: 0
                    })
                    .call({ responsible: true });

                initializerAlienTokenWallet = locklift.factory.getDeployedContract(
                    'AlienTokenWalletUpgradeable',
                    walletAddress.value0
                );

                expect(
                    Number(await locklift.provider.getBalance(initializerAlienTokenWallet.address))
                ).to.be.greaterThan(0, "Initializer token wallet balance is zero");
            });

            it('Check initializer received tokens', async () => {
                const balance = await initializerAlienTokenWallet.methods
                    .balance({ answerId: 0 })
                    .call({ responsible: true });

                expect(Number(balance.value0))
                    .to.be.equal(eventDataStructure.amount, 'Initializer failed to received tokens');
            });
        });
    });
});
