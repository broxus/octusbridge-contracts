const {
    setupRelays,
    setupBridge,
    setupTokenRootWithWallet,
    setupEthereumNativeMultiVault,
    getTokenWalletByAddress,
    expect,
    logger,
    afterRun,
    logContract,
    ...utils
} = require("./../../../../utils");


describe('Test EVM native multivault pipeline', async function() {
    this.timeout(10000000);

    let relays, bridge, bridgeOwner, staking, cellEncoder;
    let root;
    let evmConfiguration, everscaleConfiguration, proxy, initializer;
    let initializerTokenWallet;
    let metricManager;

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
        [evmConfiguration, everscaleConfiguration, proxy, initializer] = await setupEthereumNativeMultiVault(
            bridgeOwner,
            staking
        );

        [root, initializerTokenWallet] = await setupTokenRootWithWallet(
            initializer.address,
            initializer.address,
            1000
        );

        await logContract(initializerTokenWallet);

        metricManager = new utils.MetricManager(
            bridge, bridgeOwner, staking,
            evmConfiguration, everscaleConfiguration, proxy, initializer,
            root, initializerTokenWallet
        );
    });

    describe('Transfer native token from Everscale to EVM', async () => {
        const amount = 500;

        const recipient = 111;
        const chainId = 222;

        let eventContract;

        it('Transfer tokens to the Native Proxy', async () => {
            const payload = await cellEncoder.call({
                method: 'encodeNativeTransferPayloadEthereum',
                params: {
                    recipient,
                    chainId
                }
            });

            const tx = await initializer.runTarget({
                contract: initializerTokenWallet,
                method: 'transfer',
                params: {
                    amount,
                    recipient: proxy.address,
                    deployWalletValue: locklift.utils.convertCrystal('0.1', 'nano'),
                    remainingGasTo: initializer.address,
                    notify: true,
                    payload,
                },
                value: locklift.utils.convertCrystal('10', 'nano'),
            });

            logger.log(`Token transfer tx: ${tx.id}`);

            const events = await everscaleConfiguration.getEvents('NewEventContract');

            expect(events)
                .to.have.lengthOf(1, 'Everscale event configuration failed to deploy event');

            const [{
                value: {
                    eventContract: expectedEventContract
                }
            }] = events;

            logger.log(`Expected event address: ${expectedEventContract}`);

            eventContract = await locklift.factory.getContract('MultiVaultEverscaleEVMEventNative');
            eventContract.setAddress(expectedEventContract);
            eventContract.afterRun = afterRun;

            metricManager.addContract(eventContract);
        });

        it('Check initializer token balance', async () => {
            const balance = await initializerTokenWallet.call({
                method: 'balance'
            });

            expect(balance)
                .to.be.bignumber.equal(500, 'Wrong initializer token balance');
        });

        it('Check native proxy token balance', async () => {
            const proxyTokenWallet = await getTokenWalletByAddress(
                proxy.address,
                root.address
            );

            const balance = await proxyTokenWallet.call({
                method: 'balance'
            });

            expect(balance)
                .to.be.bignumber.equal(500, 'Wrong initializer token balance');
        });

        it('Check event contract exists', async () => {
            expect(await locklift.ton.getBalance(eventContract.address))
                .to.be.bignumber.greaterThan(0, 'Event contract balance is zero');
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

            const proxyTokenWallet = await getTokenWalletByAddress(
                proxy.address,
                root.address
            );

            expect(decodedData.proxy_)
                .to.be.equal(proxy.address, 'Wrong event decoded proxy');

            expect(decodedData.tokenWallet_)
                .to.be.equal(proxyTokenWallet.address, 'Wrong event decoded data token wallet');

            expect(decodedData.token_)
                .to.be.equal(root.address, 'Wrong event decoded token root');

            expect(decodedData.remainingGasTo_)
                .to.be.equal(initializer.address, 'Wrong event decoded remaining gas to');

            expect(decodedData.amount_)
                .to.be.bignumber.equal(amount, 'Wrong event decoded amount');

            expect(decodedData.recipient_)
                .to.be.bignumber.equal(recipient, 'Wrong event decoded recipient');

            expect(decodedData.chainId_)
                .to.be.bignumber.equal(chainId, 'Wrong event decoded amount');

            const name = await root.call({ method: 'name' });
            const symbol = await root.call({ method: 'symbol' });
            const decimals = await root.call({ method: 'decimals' });

            expect(decodedData.name_)
                .to.be.equal(name, 'Wrong event decoded root name');
            expect(decodedData.symbol_)
                .to.be.equal(symbol, 'Wrong event decoded root symbol');
            expect(decodedData.decimals_)
                .to.be.bignumber.equal(decimals, 'Wrong event decoded root decimals');
        });

        it('Check mutated event data', async () => {
            const eventInitData = await eventContract.call({
                method: 'getEventInitData'
            });

            const decodedData = await cellEncoder.call({
                method: 'decodeMultiVaultNativeEverscaleEthereum',
                params: {
                    data: eventInitData.voteData.eventData
                }
            });

            expect(decodedData.token_wid)
                .to.be.bignumber.equal(root.address.split(':')[0], 'Wrong event data token wid');
            expect(decodedData.token_addr)
                .to.be.bignumber.equal(`0x${root.address.split(':')[1]}`, 'Wrong event data token address');

            expect(decodedData.amount)
                .to.be.bignumber.equal(amount, 'Wrong event data amount');

            expect(decodedData.recipient)
                .to.be.bignumber.equal(recipient, 'Wrong event data recipient');

            expect(decodedData.chainId)
                .to.be.bignumber.equal(chainId, 'Wrong event data amount');

            const name = await root.call({ method: 'name' });
            const symbol = await root.call({ method: 'symbol' });
            const decimals = await root.call({ method: 'decimals' });

            expect(decodedData.name)
                .to.be.equal(name, 'Wrong event data root name');
            expect(decodedData.symbol)
                .to.be.equal(symbol, 'Wrong event data root symbol');
            expect(decodedData.decimals)
                .to.be.bignumber.equal(decimals, 'Wrong event data root decimals');
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

    describe('Transfer native token from EVM to Everscale', async () => {
        let eventDataStructure;
        let eventDataEncoded;
        let eventVoteData;
        let eventContract;

        const amount = 500;

        it('Initialize event', async () => {
            eventDataStructure = {
                token_wid: root.address.split(':')[0],
                token_addr: `0x${root.address.split(':')[1]}`,
                amount,
                recipient_wid: initializer.address.split(':')[0],
                recipient_addr: `0x${initializer.address.split(':')[1]}`,
            };

            eventDataEncoded =  await cellEncoder.call({
                method: 'encodeMultiVaultNativeEVMEverscale',
                params: eventDataStructure
            });

            eventVoteData = {
                eventTransaction: 111,
                eventIndex: 222,
                eventData: eventDataEncoded,
                eventBlockNumber: 333,
                eventBlock: 444,
            };

            const tx = await initializer.runTarget({
                contract: evmConfiguration,
                method: 'deployEvent',
                params: {
                    eventVoteData,
                },
                value: locklift.utils.convertCrystal(6, 'nano')
            });

            logger.log(`Event initialization tx: ${tx.id}`);

            const expectedEventContract = await evmConfiguration.call({
                method: 'deriveEventAddress',
                params: {
                    eventVoteData
                }
            });

            logger.log(`Expected event address: ${expectedEventContract}`);

            eventContract = await locklift.factory.getContract('MultiVaultEVMEverscaleEventNative');
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

            expect(details._eventInitData.voteData.eventTransaction)
                .to.be.bignumber.equal(eventVoteData.eventTransaction, 'Wrong event transaction');

            expect(details._eventInitData.voteData.eventIndex)
                .to.be.bignumber.equal(eventVoteData.eventIndex, 'Wrong event index');

            expect(details._eventInitData.voteData.eventData)
                .to.be.equal(eventVoteData.eventData, 'Wrong event data');

            expect(details._eventInitData.voteData.eventBlockNumber)
                .to.be.bignumber.equal(eventVoteData.eventBlockNumber, 'Wrong event block number');

            expect(details._eventInitData.voteData.eventBlock)
                .to.be.bignumber.equal(eventVoteData.eventBlock, 'Wrong event block');

            expect(details._eventInitData.configuration)
                .to.be.equal(evmConfiguration.address, 'Wrong event configuration');

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

        it('Check event decoded data', async () => {
            const decodedData = await eventContract.call({
                method: 'getDecodedData',
            });

            expect(decodedData.token_)
                .to.be.equal(root.address, 'Wrong event decoded data token');
            expect(decodedData.amount_)
                .to.be.bignumber.equal(amount, 'Wrong event decoded data amount');
            expect(decodedData.recipient_)
                .to.be.equal(initializer.address, 'Wrong event decoded data recipient');
            expect(decodedData.proxy_)
                .to.be.equal(proxy.address, 'Wrong event decoded data proxy');

            const proxyTokenWallet = await getTokenWalletByAddress(
                proxy.address,
                root.address
            );

            expect(decodedData.tokenWallet_)
                .to.be.equal(proxyTokenWallet.address, 'Wrong event decoded data token wallet');
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

            it('Check initializer token balance', async () => {
                const balance = await initializerTokenWallet.call({
                    method: 'balance'
                });

                expect(balance)
                    .to.be.bignumber.equal(1000, 'Wrong initializer token balance');
            });

            it('Check Native Proxy token balance is zero', async () => {
                const proxyTokenWallet = await getTokenWalletByAddress(
                    proxy.address,
                    root.address
                );

                const balance = await proxyTokenWallet.call({
                    method: 'balance'
                });

                expect(balance)
                    .to.be.bignumber.equal(0, 'Wrong Native Proxy token balance');
            });
        });
    });
});