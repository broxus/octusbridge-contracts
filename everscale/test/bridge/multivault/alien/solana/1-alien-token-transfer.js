const {
    setupRelays,
    setupBridge,
    setupSolanaAlienMultiVault,
    logger,
    afterRun,
    expect,
    ...utils
} = require('./../../../../utils');


describe('Test Solana alien multivault pipeline', async function() {
    this.timeout(10000000);

    let metricManager;
    let relays, bridge, bridgeOwner, staking, cellEncoder;
    let solanaConfiguration, everscaleConfiguration, proxy, initializer;

    const alienTokenBase = {
        token: 222,
    };

    let alienTokenRoot, initializerAlienTokenWallet;

    afterEach(async function() {
        const lastCheckPoint = metricManager.lastCheckPointName();
        const currentName = this.currentTest.title;

        await metricManager.checkPoint(currentName);

        if (lastCheckPoint === undefined) return;

        const difference = await metricManager.getDifference(lastCheckPoint, currentName);

        for (const [contract, balanceDiff] of Object.entries(difference)) {
            if (balanceDiff !== 0) {
                logger.log(`[Balance change] ${contract} ${locklift.utils.convertCrystal(balanceDiff, 'ton').toFixed(9)} EVER`);
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
        let eventDataStructure;
        let eventDataEncoded;
        let eventVoteData;
        let eventContract;

        it('Initialize event', async () => {
            eventDataStructure = {
                base_token: alienTokenBase.token,
                name: 'Giga Chad',
                symbol: 'GIGA_CHAD',
                decimals: 6,
                amount: 333,
                recipient_wid: initializer.address.split(':')[0],
                recipient_addr: `0x${initializer.address.split(':')[1]}`,
            };

            eventDataEncoded =  await cellEncoder.call({
                method: 'encodeMultiVaultAlienSolanaEverscale',
                params: eventDataStructure
            });

            eventVoteData = {
                accountSeed: 111,
                eventData: eventDataEncoded
            };

            const tx = await initializer.runTarget({
                contract: solanaConfiguration,
                method: 'deployEvent',
                params: {
                    eventVoteData,
                },
                value: locklift.utils.convertCrystal(6, 'nano')
            });

            logger.log(`Event initialization tx: ${tx.id}`);

            const expectedEventContract = await solanaConfiguration.call({
                method: 'deriveEventAddress',
                params: {
                    eventVoteData
                }
            });

            logger.log(`Expected event address: ${expectedEventContract}`);

            eventContract = await locklift.factory.getContract('MultiVaultSolanaEverscaleEventAlien');
            eventContract.setAddress(expectedEventContract);
            eventContract.afterRun = afterRun;

            metricManager.addContract(eventContract);
        });

        it('Check event contract exists', async () => {
            expect(await locklift.ton.getBalance(eventContract.address))
                .to.be.bignumber.greaterThan(0, 'Event contract balance is zero');
        });

        it('Check event state before confirmation', async () => {
            const details = await eventContract.call({
                method: 'getDetails',
            });

            expect(details._eventInitData.voteData.accountSeed)
                .to.be.bignumber.equal(eventVoteData.accountSeed, 'Wrong accountSeed');

            expect(details._eventInitData.voteData.eventData)
                .to.be.equal(eventVoteData.eventData, 'Wrong event data');

            expect(details._eventInitData.configuration)
                .to.be.equal(solanaConfiguration.address, 'Wrong event configuration');

            expect(details._eventInitData.staking)
                .to.be.equal(staking.address, 'Wrong staking');

            expect(details._status)
                .to.be.bignumber.equal(1, 'Wrong status');

            expect(details._confirms)
                .to.have.lengthOf(0, 'Wrong amount of relays confirmations');

            expect(details._rejects)
                .to.have.lengthOf(0, 'Wrong amount of relays rejects');

            expect(details._initializer)
                .to.be.equal(initializer.address, 'Wrong initializer');
        });

        it('Check event initialization pipeline passed', async () => {
            const decodedData = await eventContract.call({
                method: 'getDecodedData',
            });

            expect(decodedData.proxy_)
                .to.not.be.equal(locklift.utils.zeroAddress, 'Event contract failed to fetch the proxy');
            expect(decodedData.token_)
                .to.not.be.equal(locklift.utils.zeroAddress, 'Event contract failed to fetch the token');
        });

        it('Deploy alien token', async () => {
            const tx = await initializer.runTarget({
                contract: proxy,
                method: 'deployAlienToken',
                params: {
                    token: eventDataStructure.base_token,
                    name: eventDataStructure.name,
                    symbol: eventDataStructure.symbol,
                    decimals: eventDataStructure.decimals,
                    remainingGasTo: initializer.address
                },
                value: locklift.utils.convertCrystal(6, 'nano')
            });

            logger.log(`Token deployment tx: ${tx.id}`);

            const tokenAddress = await proxy.call({
                method: 'deriveAlienTokenRoot',
                params: {
                    token: eventDataStructure.base_token,
                    name: eventDataStructure.name,
                    symbol: eventDataStructure.symbol,
                    decimals: eventDataStructure.decimals,
                }
            });

            alienTokenRoot = await locklift.factory.getContract('TokenRootAlienSolanaEverscale');
            alienTokenRoot.setAddress(tokenAddress);
            alienTokenRoot.afterRun = afterRun;

            await utils.logContract(alienTokenRoot);

            metricManager.addContract(alienTokenRoot);
        });

        it('Check alien token root exists', async () => {
            expect(await locklift.ton.getBalance(alienTokenRoot.address))
                .to.be.bignumber.greaterThan(0, 'Alien token root balance is zero');
        });

        it('Check event required votes', async () => {
            const requiredVotes = await eventContract.call({
                method: 'requiredVotes',
            });

            const relays = await eventContract.call({
                method: 'getVoters',
                params: {
                    vote: 1
                }
            });

            expect(requiredVotes)
                .to.be.bignumber.greaterThan(0, 'Too low required votes for event');
            expect(relays.length)
                .to.be.bignumber.greaterThanOrEqual(requiredVotes.toNumber(), 'Too many required votes for event');
        });

        it('Check event round number', async () => {
            const roundNumber = await eventContract.call({ method: 'round_number' });

            expect(roundNumber)
                .to.be.bignumber.equal(0, 'Wrong round number');
        });

        it('Check alien token root meta', async () => {
            const meta = await alienTokenRoot.call({
                method: 'meta',
            });

            expect(meta.base_token)
                .to.be.bignumber.equal(eventDataStructure.base_token, 'Wrong alien token base token');
            expect(meta.name)
                .to.be.equal(eventDataStructure.name, 'Wrong alien token name');
            expect(meta.symbol)
                .to.be.equal(eventDataStructure.symbol, 'Wrong alien token symbol');
            expect(meta.decimals)
                .to.be.bignumber.equal(eventDataStructure.decimals, 'Wrong alien token decimals');
        });

        describe('Confirm event', async () => {
            it('Confirm event enough times', async () => {
                const requiredVotes = await eventContract.call({
                    method: 'requiredVotes',
                });
                const confirmations = [];
                for (const [relayId, relay] of Object.entries(relays.slice(0, requiredVotes))) {
                    logger.log(`Confirm #${relayId} from ${relay.public}`);

                    confirmations.push(eventContract.run({
                        method: 'confirm',
                        params: {
                            voteReceiver: eventContract.address
                        },
                        keyPair: relay
                    }));
                }
                await Promise.all(confirmations);
            });

            it('Check event confirmed', async () => {
                const details = await eventContract.call({
                    method: 'getDetails'
                });

                const requiredVotes = await eventContract.call({
                    method: 'requiredVotes',
                });

                expect(details._status)
                    .to.be.bignumber.equal(2, 'Wrong status');

                expect(details._confirms)
                    .to.have.lengthOf(requiredVotes, 'Wrong amount of relays confirmations');

                expect(details._rejects)
                    .to.have.lengthOf(0, 'Wrong amount of relays rejects');
            });

            it('Check token total supply', async () => {
                const totalSupply = await alienTokenRoot.call({
                    method: 'totalSupply'
                });

                expect(totalSupply)
                    .to.be.bignumber.equal(eventDataStructure.amount, 'Wrong total supply');
            });

            it('Check initializer token wallet exists', async () => {
                const walletAddress = await alienTokenRoot.call({
                    method: 'walletOf',
                    params: {
                        walletOwner: initializer.address
                    }
                });

                initializerAlienTokenWallet = await locklift.factory.getContract('AlienTokenWalletUpgradeable');
                initializerAlienTokenWallet.name = 'Initializer alien token wallet';
                initializerAlienTokenWallet.setAddress(walletAddress);
                initializerAlienTokenWallet.afterRun = afterRun;

                expect(await locklift.ton.getBalance(walletAddress))
                    .to.be.bignumber.greaterThan(0, 'Initializer token wallet balance is zero');
            });

            it('Check initializer received tokens', async () => {
                const balance = await initializerAlienTokenWallet.call({
                    method: 'balance'
                });

                expect(balance)
                    .to.be.bignumber.equal(eventDataStructure.amount, 'Initializer failed to receive tokens');
            });
        });
    });

    describe('Transfer alien token from Everscale to Solana', async () => {
        let eventContract;

        const amount = 333;
        const recipient = 888;

        it('Burn tokens in favor of Alien Proxy', async () => {
            const burnPayload = await cellEncoder.call({
                method: 'encodeAlienBurnPayloadSolana',
                params: {
                    recipient
                }
            });

            const tx = await initializer.runTarget({
                contract: initializerAlienTokenWallet,
                method: 'burn',
                params: {
                    amount,
                    remainingGasTo: initializer.address,
                    callbackTo: proxy.address,
                    payload: burnPayload,
                },
                value: locklift.utils.convertCrystal(10, 'nano')
            });

            logger.log(`Event initialization tx: ${tx.id}`);

            const events = await everscaleConfiguration.getEvents('NewEventContract');

            expect(events)
                .to.have.lengthOf(1, 'Everscale event configuration failed to deploy event');

            const [{
                value: {
                    eventContract: expectedEventContract
                }
            }] = events;

            logger.log(`Expected event address: ${expectedEventContract}`);

            eventContract = await locklift.factory.getContract('MultiVaultEverscaleSolanaEventAlien');
            eventContract.setAddress(expectedEventContract);
            eventContract.afterRun = afterRun;

            metricManager.addContract(eventContract);
        });

        it('Check event contract exists', async () => {
            expect(await locklift.ton.getBalance(eventContract.address))
                .to.be.bignumber.greaterThan(0, 'Event contract balance is zero');
        });

        it('Check total supply reduced', async () => {
            const totalSupply = await alienTokenRoot.call({
                method: 'totalSupply'
            });

            expect(totalSupply)
                .to.be.bignumber.equal(0, 'Wrong total supply');
        });

        it('Check initializer token wallet balance is zero', async () => {
            const balance = await initializerAlienTokenWallet.call({
                method: 'balance'
            });

            expect(balance)
                .to.be.bignumber.equal(0, 'Initializer failed to burn tokens');
        });

        it('Check event state before confirmation', async () => {
            const details = await eventContract.call({
                method: 'getDetails',
            });

            expect(details._eventInitData.configuration)
                .to.be.equal(everscaleConfiguration.address, 'Wrong event configuration');

            expect(details._status)
                .to.be.bignumber.equal(1, 'Wrong status');

            expect(details._confirms)
                .to.have.lengthOf(0, 'Wrong amount of confirmations');

            expect(details._signatures)
                .to.have.lengthOf(0, 'Wrong amount of signatures');

            expect(details._rejects)
                .to.have.lengthOf(0, 'Wrong amount of rejects');

            expect(details._initializer)
                .to.be.equal(proxy.address, 'Wrong initializer');
        });

        it('Check event data after mutation', async () => {
            const decodedData = await eventContract.call({
                method: 'getDecodedData'
            });

            expect(decodedData.base_token_)
                .to.be.bignumber.equal(alienTokenBase.token, 'Wrong alien base token');

            const eventInitData = await eventContract.call({
                method: 'getEventInitData'
            });

            const decodedEventData = await cellEncoder.call({
                method: 'decodeMultiVaultAlienEverscaleSolana',
                params: {
                    data: eventInitData.voteData.eventData
                }
            });

            expect(decodedEventData.base_token)
                .to.be.bignumber.equal(alienTokenBase.token, 'Wrong event data base token');
            expect(decodedEventData.amount)
                .to.be.bignumber.equal(amount, 'Wrong event data amount');
            expect(decodedEventData.recipient)
                .to.be.bignumber.equal(recipient, 'Wrong event data recipient');
        });

        it('Check event required votes', async () => {
            const requiredVotes = await eventContract.call({
                method: 'requiredVotes',
            });

            const relays = await eventContract.call({
                method: 'getVoters',
                params: {
                    vote: 1
                }
            });

            expect(requiredVotes)
                .to.be.bignumber.greaterThan(0, 'Too low required votes for event');
            expect(relays.length)
                .to.be.bignumber.greaterThanOrEqual(requiredVotes.toNumber(), 'Too many required votes for event');
        });

        describe('Confirm event', async () => {
            it('Confirm event enough times', async () => {
                const requiredVotes = await eventContract.call({
                    method: 'requiredVotes',
                });
                const confirmations = [];
                for (const [relayId, relay] of Object.entries(relays.slice(0, requiredVotes))) {
                    logger.log(`Confirm #${relayId} from ${relay.public}`);

                    confirmations.push(eventContract.run({
                        method: 'confirm',
                        params: {
                            signature: Buffer
                                .from(`0x${'ff'.repeat(65)}`)
                                .toString('hex'), // 132 symbols
                            voteReceiver: eventContract.address,
                        },
                        keyPair: relay
                    }));
                }
                await Promise.all(confirmations);
            });

            it('Check event confirmed', async () => {
                const details = await eventContract.call({
                    method: 'getDetails'
                });

                const requiredVotes = await eventContract.call({
                    method: 'requiredVotes',
                });

                expect(details.balance)
                    .to.be.bignumber.greaterThan(0, 'Wrong balance');

                expect(details._status)
                    .to.be.bignumber.equal(2, 'Wrong status');

                expect(details._confirms)
                    .to.have.lengthOf(requiredVotes, 'Wrong amount of relays confirmations');

                expect(details._signatures)
                    .to.have.lengthOf(requiredVotes, 'Wrong amount of signatures');

                expect(details._rejects)
                    .to.have.lengthOf(0, 'Wrong amount of relays rejects');
            });

            it('Close event', async () => {
                await initializer.runTarget({
                    contract: eventContract,
                    method: 'close'
                });
            });
        });
    });
});