import {Ed25519KeyPair} from "nekoton-wasm";

const {
    setupRelays,
    setupBridge,
    setupSolanaAlienMultiVault,
    MetricManager,
    logger,
    ...utils
} = require('../../../../utils');

import { expect } from "chai";
import { Contract } from "locklift";
import { FactorySource } from "../../../../../build/factorySource";
import {Account} from "everscale-standalone-client/nodejs";
const {zeroAddress} = require("locklift");

let bridge: Contract<FactorySource["Bridge"]>;
let cellEncoder: Contract<FactorySource["CellEncoderStandalone"]>;
let staking: Contract<FactorySource["StakingMockup"]>;
let bridgeOwner: Account;
let metricManager: InstanceType<typeof MetricManager>;
let relays: Ed25519KeyPair[];
let solanaConfiguration: Contract<FactorySource["SolanaEverscaleEventConfiguration"]>;
let everscaleConfiguration: Contract<FactorySource["EverscaleSolanaEventConfiguration"]>;
let proxy: Contract<FactorySource["ProxyMultiVaultSolanaAlien"]>;
let initializer: Account;
let initializerAlienTokenWallet: Contract<FactorySource["AlienTokenWalletUpgradeable"]>;
let alienTokenRoot: Contract<FactorySource["TokenRootAlienSolanaEverscale"]>;


describe('Test Solana alien multivault pipeline', async function() {
    this.timeout(10000000);

    const alienTokenBase = {
        token: 222,
    };

    afterEach(async function() {
        const lastCheckPoint = metricManager.lastCheckPointName();
        const currentName = this.currentTest?.title;

        await metricManager.checkPoint(currentName);

        if (lastCheckPoint === undefined) return;

        const difference = await metricManager.getDifference(lastCheckPoint, currentName);

        for (const [contract, balanceDiff] of Object.entries(difference)) {
            if (balanceDiff !== 0) {
                logger.log(`[Balance change] ${contract} ${locklift.utils.fromNano(balanceDiff as number)} EVER`);
            }
        }
    });

    it('Setup bridge', async () => {
        relays = await setupRelays();
        [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

        [solanaConfiguration, everscaleConfiguration, proxy, initializer] = await setupSolanaAlienMultiVault(
            bridgeOwner,
            staking,
            cellEncoder
        );

        metricManager = new utils.MetricManager(
            bridge, bridgeOwner, staking,
            solanaConfiguration, everscaleConfiguration, proxy, initializer
        );
    });

    describe('Transfer alien token from Solana to Everscale', async () => {
        let eventDataStructure: any;
        let eventDataEncoded;
        let eventVoteData: any;
        let eventContract: Contract<FactorySource["MultiVaultSolanaEverscaleEventAlien"]>;

        it('Initialize event', async () => {
            eventDataStructure = {
                base_token: alienTokenBase.token,
                name: 'Giga Chad',
                symbol: 'GIGA_CHAD',
                decimals: 6,
                amount: 333,
                recipient_wid: initializer.address.toString().split(':')[0],
                recipient_addr: `0x${initializer.address.toString().split(':')[1]}`,
            };

            eventDataEncoded = await cellEncoder.methods.encodeMultiVaultAlienSolanaEverscale(eventDataStructure).call();

            eventVoteData = {
                accountSeed: 111,
                slot: 0,
                blockTime: 0,
                txSignature: '',
                eventData: eventDataEncoded
            };

            const tx = await solanaConfiguration.methods.deployEvent({
                eventVoteData,
            }).send({
                from: initializer.address,
                amount: locklift.utils.toNano(6),
            });

            logger.log(`Event initialization tx: ${tx.id}`);

            const expectedEventContract = await solanaConfiguration.methods.deriveEventAddress(eventVoteData).call();

            logger.log(`Expected event address: ${expectedEventContract}`);

            eventContract = await locklift.factory.getDeployedContract('MultiVaultSolanaEverscaleEventAlien', expectedEventContract.eventContract);

            metricManager.addContract(eventContract);
        });

        it('Check event contract exists', async () => {
            expect(await locklift.provider.getBalance(eventContract.address))
                .to.be.greaterThan(0, 'Event contract balance is zero');
        });

        it('Check event state before confirmation', async () => {
            const details = await eventContract.methods.getDetails({answerId: 0}).call();

            expect(details._eventInitData.voteData.accountSeed)
                .to.be.equal(eventVoteData.accountSeed, 'Wrong accountSeed');

            expect(details._eventInitData.voteData.eventData)
                .to.be.equal(eventVoteData.eventData, 'Wrong event data');

            expect(details._eventInitData.configuration)
                .to.be.equal(solanaConfiguration.address, 'Wrong event configuration');

            expect(details._eventInitData.staking)
                .to.be.equal(staking.address, 'Wrong staking');

            expect(details._status)
                .to.be.equal(1, 'Wrong status');

            expect(details._confirms)
                .to.have.lengthOf(0, 'Wrong amount of relays confirmations');

            expect(details._rejects)
                .to.have.lengthOf(0, 'Wrong amount of relays rejects');

            expect(details._initializer)
                .to.be.equal(initializer.address, 'Wrong initializer');
        });

        it('Check event initialization pipeline passed', async () => {
            const decodedData = await eventContract.methods.getDecodedData({answerId: 0}).call();

            expect(decodedData.proxy_)
                .to.not.be.equal(zeroAddress, 'Event contract failed to fetch the proxy');
            expect(decodedData.token_)
                .to.not.be.equal(zeroAddress, 'Event contract failed to fetch the token');
        });

        it('Deploy alien token', async () => {
            const tx = await proxy.methods.deployAlienToken({
                token: eventDataStructure.base_token,
                name: eventDataStructure.name,
                symbol: eventDataStructure.symbol,
                decimals: eventDataStructure.decimals,
                remainingGasTo: initializer.address
            }).send({
                from: initializer.address,
                amount: locklift.utils.toNano(6),
            });

            logger.log(`Token deployment tx: ${tx.id}`);

            const tokenAddress = await proxy.methods.deriveAlienTokenRoot({
                token: eventDataStructure.base_token,
                name: eventDataStructure.name,
                symbol: eventDataStructure.symbol,
                decimals: eventDataStructure.decimals,
                answerId: 0,
            }).call();

            alienTokenRoot = await locklift.factory.getDeployedContract('TokenRootAlienSolanaEverscale', tokenAddress.value0);

            await utils.logContract(alienTokenRoot);

            metricManager.addContract(alienTokenRoot);
        });

        it('Check alien token root exists', async () => {
            expect(await locklift.provider.getBalance(alienTokenRoot.address))
                .to.be.greaterThan(0, 'Alien token root balance is zero');
        });

        it('Check event required votes', async () => {
            const requiredVotes = await eventContract.methods.requiredVotes().call();

            const relays = await eventContract.methods.getVoters({
                vote: 1,
                answerId: 0
            }).call();

            expect(requiredVotes.requiredVotes)
                .to.be.greaterThan(0, 'Too low required votes for event');
            expect(relays.voters.length)
                .to.be.greaterThanOrEqual(parseInt(requiredVotes.requiredVotes, 10), 'Too many required votes for event');
        });

        it('Check event round number', async () => {
            const roundNumber = await eventContract.methods.round_number({}).call();

            expect(roundNumber.round_number)
                .to.be.equal(0, 'Wrong round number');
        });

        it('Check alien token root meta', async () => {
            const meta = await alienTokenRoot.methods.meta({answerId: 0}).call();

            expect(meta.base_token)
                .to.be.equal(eventDataStructure.base_token, 'Wrong alien token base token');
            expect(meta.name)
                .to.be.equal(eventDataStructure.name, 'Wrong alien token name');
            expect(meta.symbol)
                .to.be.equal(eventDataStructure.symbol, 'Wrong alien token symbol');
            expect(meta.decimals)
                .to.be.equal(eventDataStructure.decimals, 'Wrong alien token decimals');
        });

        describe('Confirm event', async () => {
            it('Confirm event enough times', async () => {
                const requiredVotes = await eventContract.methods.requiredVotes().call();
                const confirmations = [];
                for (const [relayId, relay] of Object.entries(relays.slice(0, parseInt(requiredVotes.requiredVotes, 10)))) {
                    logger.log(`Confirm #${relayId} from ${relay.publicKey}`);

                    locklift.keystore.addKeyPair(relay);

                    confirmations.push(eventContract.methods.confirm({
                        voteReceiver: eventContract.address
                    }).sendExternal({
                        publicKey: relay.publicKey,
                    }));
                }
                await Promise.all(confirmations);
            });

            it('Check event confirmed', async () => {
                const details = await eventContract.methods.getDetails({answerId: 0}).call();

                const requiredVotes = await eventContract.methods.requiredVotes().call();

                expect(details._status)
                    .to.be.equal(2, 'Wrong status');

                expect(details._confirms)
                    .to.have.lengthOf(parseInt(requiredVotes.requiredVotes, 10), 'Wrong amount of relays confirmations');

                expect(details._rejects)
                    .to.have.lengthOf(0, 'Wrong amount of relays rejects');
            });

            it('Check token total supply', async () => {
                const totalSupply = await alienTokenRoot.methods.totalSupply({answerId: 0}).call();

                expect(totalSupply.value0)
                    .to.be.equal(eventDataStructure.amount, 'Wrong total supply');
            });

            it('Check initializer token wallet exists', async () => {
                const walletAddress = await alienTokenRoot.methods.walletOf({walletOwner: initializer.address, answerId: 0}).call();

                initializerAlienTokenWallet = await locklift.factory.getDeployedContract('AlienTokenWalletUpgradeable', walletAddress.value0);

                expect(await locklift.provider.getBalance(walletAddress.value0))
                    .to.be.greaterThan(0, 'Initializer token wallet balance is zero');
            });

            it('Check initializer received tokens', async () => {
                const balance = await initializerAlienTokenWallet.methods.balance({answerId: 0}).call();

                expect(parseInt(balance.value0, 10))
                    .to.be.equal(eventDataStructure.amount, 'Initializer failed to receive tokens');
            });
        });
    });

    describe('Transfer alien token from Everscale to Solana', async () => {
        let eventContract: Contract<FactorySource["MultiVaultEverscaleSolanaEventAlien"]>;

        const amount = 333;
        const recipient = 888;

        it('Burn tokens in favor of Alien Proxy', async () => {
            const burnPayload = await cellEncoder.methods.encodeAlienBurnPayloadSolana({recipient}).call();

            const tx = await initializerAlienTokenWallet.methods.burn({
                amount,
                remainingGasTo: initializer.address,
                callbackTo: proxy.address,
                payload: burnPayload.value0,
            }).send({
                from: initializer.address,
                amount: locklift.utils.toNano(10)
            });

            logger.log(`Event initialization tx: ${tx.id}`);

            const events = await everscaleConfiguration.getPastEvents({filter: 'NewEventContract'}).then((e) => e.events);

            expect(events)
                .to.have.lengthOf(1, 'Everscale event configuration failed to deploy event');

            const [{
                data: {
                    eventContract: expectedEventContract
                }
            }] = events;

            logger.log(`Expected event address: ${expectedEventContract}`);

            eventContract = await locklift.factory.getDeployedContract('MultiVaultEverscaleSolanaEventAlien', expectedEventContract);

            metricManager.addContract(eventContract);
        });

        it('Check event contract exists', async () => {
            expect(await locklift.provider.getBalance(eventContract.address))
                .to.be.greaterThan(0, 'Event contract balance is zero');
        });

        it('Check total supply reduced', async () => {
            const totalSupply = await alienTokenRoot.methods.totalSupply({answerId: 0}).call();

            expect(totalSupply.value0)
                .to.be.equal(0, 'Wrong total supply');
        });

        it('Check initializer token wallet balance is zero', async () => {
            const balance = await initializerAlienTokenWallet.methods.balance({answerId: 0}).call();

            expect(balance.value0)
                .to.be.equal(0, 'Initializer failed to burn tokens');
        });

        it('Check event state before confirmation', async () => {
            const details = await eventContract.methods.getDetails({answerId: 0}).call();

            expect(details._eventInitData.configuration)
                .to.be.equal(everscaleConfiguration.address, 'Wrong event configuration');

            expect(details._status)
                .to.be.equal(1, 'Wrong status');

            expect(details._confirms)
                .to.have.lengthOf(0, 'Wrong amount of confirmations');

            expect(details._rejects)
                .to.have.lengthOf(0, 'Wrong amount of rejects');

            expect(details._initializer)
                .to.be.equal(proxy.address, 'Wrong initializer');
        });

        it('Check event data after mutation', async () => {
            const decodedData = await eventContract.methods.getDecodedData({answerId: 0}).call();

            expect(decodedData.base_token_)
                .to.be.equal(alienTokenBase.token, 'Wrong alien base token');

            const eventInitData = await eventContract.methods.getEventInitData({answerId: 0}).call();

            const decodedEventData = await cellEncoder.methods.decodeMultiVaultAlienEverscaleSolana({
                data: eventInitData.value0.voteData.eventData}).call();

            expect(decodedEventData.base_token)
                .to.be.equal(alienTokenBase.token, 'Wrong event data base token');
            expect(decodedEventData.amount)
                .to.be.equal(amount, 'Wrong event data amount');
            expect(decodedEventData.recipient)
                .to.be.equal(recipient, 'Wrong event data recipient');
        });

        it('Check event required votes', async () => {
            const requiredVotes = await eventContract.methods.requiredVotes().call();


            const relays = await eventContract.methods.getVoters({
                vote: 1,
                answerId: 0
            }).call();

            expect(requiredVotes)
                .to.be.greaterThan(0, 'Too low required votes for event');
            expect(relays.voters.length)
                .to.be.greaterThanOrEqual(parseInt(requiredVotes.requiredVotes, 10), 'Too many required votes for event');
        });

        describe('Confirm event', async () => {
            it('Confirm event enough times', async () => {
                const requiredVotes = await eventContract.methods.requiredVotes().call();
                const confirmations = [];
                for (const [relayId, relay] of Object.entries(relays.slice(0, parseInt(requiredVotes.requiredVotes, 10)))) {
                    logger.log(`Confirm #${relayId} from ${relay.publicKey}`);

                    locklift.keystore.addKeyPair(relay);

                    confirmations.push(eventContract.methods.confirm({
                        voteReceiver: eventContract.address,
                    }).sendExternal({
                        publicKey: relay.publicKey,
                    }));

                }
                await Promise.all(confirmations);
            });

            it('Check event confirmed', async () => {
                const details = await eventContract.methods.getDetails({answerId: 0}).call();

                const requiredVotes = await eventContract.methods.requiredVotes().call();

                expect(details.balance)
                    .to.be.greaterThan(0, 'Wrong balance');

                expect(details._status)
                    .to.be.equal(2, 'Wrong status');

                expect(details._confirms)
                    .to.have.lengthOf(parseInt(requiredVotes.requiredVotes, 10), 'Wrong amount of relays confirmations');

                expect(details._rejects)
                    .to.have.lengthOf(0, 'Wrong amount of relays rejects');
            });

            it('Close event', async () => {
                await eventContract.methods.close({
                }).send({
                    from: initializer.address,
                    amount: locklift.utils.toNano(1),
                });
            });
        });
    });
});