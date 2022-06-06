const {
    setupRelays,
    setupBridge,
    setupAlienMultiVault,
    logger,
    afterRun,
    expect,
    ...utils
} = require('./../../../utils');


describe('Deposit non-canon token from EVM to Everscale with merging', async function() {
    this.timeout(10000000);

    let metricManager;
    let relays, bridge, bridgeOwner, staking, cellEncoder;
    let evmConfiguration, everscaleConfiguration, proxy, initializer;

    let alienTokenRoot, mergeRouter, initializerAlienTokenWallet;
    let canonTokenRoot, mergePool, initializerCanonTokenWallet;

    let proxyManager;

    let eventDataStructure;
    let eventDataEncoded;
    let eventVoteData;
    let eventContract;

    const alienTokenMeta = {
        chainId: 111,
        token: 222,
        name: 'Giga Chad',
        symbol: 'GIGA_CHAD',
        decimals: 6,
    };

    const canonTokenMeta = {
        chainId: 112,
        token: 222,
        name: 'Giga Chad',
        symbol: 'GIGA_CHAD',
        decimals: 7,
    };

    const amount = 333;

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

        [evmConfiguration, everscaleConfiguration, proxy, initializer] = await setupAlienMultiVault(
            bridgeOwner,
            staking,
            cellEncoder
        );

        metricManager = new utils.MetricManager(
            bridge, bridgeOwner, staking,
            evmConfiguration, everscaleConfiguration, proxy, initializer
        );
    });

    it('Deploy proxy manager', async () => {
        const [,keyPair] = await locklift.keys.getKeyPairs();

        proxyManager = await utils.deployAccount(
            keyPair,
            50,
        );

        proxyManager.name = 'Proxy manager';

        metricManager.addContract(proxyManager);
    });

    it('Set proxy manager', async () => {
        await bridgeOwner.runTarget({
            contract: proxy,
            method: 'setManager',
            params: {
                _manager: proxyManager.address
            }
        });

        expect(await proxy.call({ method: 'manager' }))
            .to.be.equal(proxyManager.address, 'Wrong manager in alien proxy');
    });

    it('Deploy alien token root', async () => {
        const tx = await initializer.runTarget({
            contract: proxy,
            method: 'deployAlienToken',
            params: {
                ...alienTokenMeta,
                remainingGasTo: initializer.address
            },
            value: locklift.utils.convertCrystal(6, 'nano')
        });

        logger.log(`Alien token deployment tx: ${tx.transaction.id}`);

        const alienTokenRootAddress = await proxy.call({
            method: 'deriveAlienTokenRoot',
            params: {
                ...alienTokenMeta,
                remainingGasTo: initializer.address
            }
        });

        alienTokenRoot = await locklift.factory.getContract('TokenRootAlienEVM');
        alienTokenRoot.setAddress(alienTokenRootAddress);
        alienTokenRoot.afterRun = afterRun;

        await utils.logContract(alienTokenRoot);

        metricManager.addContract(alienTokenRoot);
    });

    it('Deploy alien merge router', async () => {
        const tx = await initializer.runTarget({
            contract: proxy,
            method: 'deployMergeRouter',
            params: {
                token: alienTokenRoot.address
            },
            value: locklift.utils.convertCrystal(6, 'nano')
        });

        logger.log(`Alien merge router deployment tx: ${tx.transaction.id}`);

        const routerAddress = await proxy.call({
            method: 'deriveMergeRouter',
            params: {
                token: alienTokenRoot.address
            }
        });

        mergeRouter = await locklift.factory.getContract('MergeRouter');
        mergeRouter.setAddress(routerAddress);
        mergeRouter.afterRun = afterRun;

        await utils.logContract(mergeRouter);

        metricManager.addContract(mergeRouter);
    });

    it('Check merge router data', async () => {
        const details = await mergeRouter.call({
            method: 'getDetails'
        });

        expect(details._proxy)
            .to.be.equal(proxy.address, 'Wrong proxy address in merge router');
        expect(details._token)
            .to.be.equal(alienTokenRoot.address, 'Wrong token address in merge router');
        expect(details._pool)
            .to.be.equal(locklift.utils.zeroAddress, 'Wrong pool address in merge router');

        expect(await mergeRouter.call({ method: 'owner' }))
            .to.be.equal(await proxy.call({ method: 'owner' }), 'Wrong router owner');
        expect(await mergeRouter.call({ method: 'manager' }))
            .to.be.equal(await proxy.call({ method: 'manager' }), 'Wrong router manager');
    });

    it('Deploy canon token root', async () => {
        const tx = await initializer.runTarget({
            contract: proxy,
            method: 'deployAlienToken',
            params: {
                ...canonTokenMeta,
                remainingGasTo: initializer.address
            },
            value: locklift.utils.convertCrystal(6, 'nano')
        });

        logger.log(`Canon token deployment tx: ${tx.transaction.id}`);

        const alienTokenRootAddress = await proxy.call({
            method: 'deriveAlienTokenRoot',
            params: {
                ...canonTokenMeta,
                remainingGasTo: initializer.address
            }
        });

        canonTokenRoot = await locklift.factory.getContract('TokenRootAlienEVM');
        canonTokenRoot.setAddress(alienTokenRootAddress);
        canonTokenRoot.afterRun = afterRun;
        canonTokenRoot.name = 'Canon token root';

        await utils.logContract(alienTokenRoot);

        metricManager.addContract(alienTokenRoot);
    });

    it('Deploy merge pool', async () => {
        const nonce = locklift.utils.getRandomNonce();

        const tx = await proxyManager.runTarget({
            contract: proxy,
            method: 'deployMergePool',
            params: {
                nonce,
                tokens: [alienTokenRoot.address, canonTokenRoot.address],
                canonId: 1
            }
        });

        logger.log(`Merge pool deployment tx: ${tx.transaction.id}`);

        const mergePoolAddress = await proxy.call({
            method: 'deriveMergePool',
            params: {
                nonce
            }
        });

        mergePool = await locklift.factory.getContract('MergePool');
        mergePool.setAddress(mergePoolAddress);
        mergePool.afterRun = afterRun;

        await utils.logContract(mergePool);

        metricManager.addContract(mergePool);
    });

    it('Check merge pool settings', async () => {
        expect(await mergePool.call({ method: 'owner' }))
            .to.be.equal(bridgeOwner.address, 'Wrong merge pool owner');
        expect(await mergePool.call({ method: 'manager' }))
            .to.be.equal(proxyManager.address, 'Wrong merge pool manager');
        expect(await mergePool.call({ method: 'version' }))
            .to.be.bignumber.equal(1, 'Wrong merge pool version');
    });

    it('Check merge pool tokens', async () => {
        const tokens = await mergePool.call({ method: 'getTokens' });

        expect(tokens._canon)
            .to.be.equal(canonTokenRoot.address, 'Wrong canon token in merge pool');

        expect(tokens._tokens[alienTokenRoot.address].decimals)
            .to.be.bignumber.equal(alienTokenMeta.decimals, 'Wrong alien decimals in merge pool');
        expect(tokens._tokens[canonTokenRoot.address].decimals)
            .to.be.bignumber.equal(canonTokenMeta.decimals, 'Wrong canon decimals in merge pool');


        expect(tokens._tokens[alienTokenRoot.address].enabled)
            .to.be.equal(false, 'Wrong alien status in merge pool');
        expect(tokens._tokens[canonTokenRoot.address].enabled)
            .to.be.equal(false, 'Wrong canon status in merge pool');
    });

    it('Enable merge pool tokens', async () => {
        await proxyManager.runTarget({
            contract: mergePool,
            method: 'enableAll',
            params: {}
        });

        const tokens = await mergePool.call({ method: 'getTokens' });

        expect(tokens._tokens[alienTokenRoot.address].enabled)
            .to.be.equal(true, 'Wrong alien status in merge pool');
        expect(tokens._tokens[canonTokenRoot.address].enabled)
            .to.be.equal(true, 'Wrong canon status in merge pool');
    });

    it('Set pool in alien merge router', async () => {
        await proxyManager.runTarget({
            contract: mergeRouter,
            method: 'setPool',
            params: {
                pool_: mergePool.address
            }
        });

        const pool = await mergeRouter.call({ method: 'getPool' });

        expect(pool)
            .to.be.equal(mergePool.address, 'Wrong pool in router');
    });

    it('Initialize event', async () => {
        eventDataStructure = {
            base_chainId: alienTokenMeta.chainId,
            base_token: alienTokenMeta.token,
            name: alienTokenMeta.name,
            symbol: alienTokenMeta.symbol,
            decimals: alienTokenMeta.decimals,
            amount,
            recipient_wid: initializer.address.split(':')[0],
            recipient_addr: `0x${initializer.address.split(':')[1]}`,
        };

        eventDataEncoded =  await cellEncoder.call({
            method: 'encodeMultiVaultAlienEVM',
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

        logger.log(`Event initialization tx: ${tx.transaction.id}`);

        const expectedEventContract = await evmConfiguration.call({
            method: 'deriveEventAddress',
            params: {
                eventVoteData
            }
        });

        logger.log(`Expected event address: ${expectedEventContract}`);

        eventContract = await locklift.factory.getContract('MultiVaultEVMEventAlien');
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

    it('Check event initialization pipeline passed', async () => {
        const decodedData = await eventContract.call({
            method: 'getDecodedDataExtended',
        });

        expect(decodedData.proxy_)
            .to.be.equal(proxy.address, 'Event contract failed to fetch the proxy');
        expect(decodedData.token_)
            .to.be.equal(alienTokenRoot.address, 'Event contract failed to fetch the token');
        expect(decodedData.router_)
            .to.be.equal(mergeRouter.address, 'Merge router address invalid');

        expect(decodedData.pool_)
            .to.be.equal(mergePool.address, 'Wrong merge pool');
        expect(decodedData.canon_)
            .to.be.equal(canonTokenRoot.address, 'Wrong canon token');
        expect(decodedData.target_token_)
            .to.be.equal(canonTokenRoot.address, 'Target token should be canon');
        expect(decodedData.target_amount_)
            .to.be.bignumber.equal(3330, 'Target amount should be normalized by canon decimals');
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

        it('Check alien total supply is zero', async () => {
            const totalSupply = await alienTokenRoot.call({
                method: 'totalSupply'
            });

            expect(totalSupply)
                .to.be.bignumber.equal(0, 'Wrong total supply');
        });

        it('Check canon total supply', async () => {
            const totalSupply = await canonTokenRoot.call({
                method: 'totalSupply'
            });

            expect(totalSupply)
                .to.be.bignumber.equal(3330, 'Wrong total supply');
        });

        it('Check initializer token wallet exists', async () => {
            const walletAddress = await canonTokenRoot.call({
                method: 'walletOf',
                params: {
                    walletOwner: initializer.address
                }
            });

            initializerCanonTokenWallet = await locklift.factory.getContract('AlienTokenWalletUpgradeable');
            initializerCanonTokenWallet.name = 'Initializer canon token wallet';
            initializerCanonTokenWallet.setAddress(walletAddress);
            initializerCanonTokenWallet.afterRun = afterRun;

            expect(await locklift.ton.getBalance(walletAddress))
                .to.be.bignumber.greaterThan(0, 'Initializer token wallet balance is zero');

            metricManager.addContract(initializerCanonTokenWallet);
        });

        it('Check initializer received tokens', async () => {
            const balance = await initializerCanonTokenWallet.call({
                method: 'balance'
            });

            expect(balance)
                .to.be.bignumber.equal(3330, 'Initializer failed to receive tokens');
        });
    });

    describe('Deposit with disabled tokens', async () => {
        it('Disable canon token in the merge pool', async () => {
            await proxyManager.runTarget({
                contract: mergePool,
                method: 'disableToken',
                params: {
                    token: canonTokenRoot.address
                }
            });

            const tokens = await mergePool.call({ method: 'getTokens' });

            expect(tokens._tokens[alienTokenRoot.address].enabled)
                .to.be.equal(true, 'Wrong alien status in merge pool');
            expect(tokens._tokens[canonTokenRoot.address].enabled)
                .to.be.equal(false, 'Wrong canon status in merge pool');
        });

        it('Deposit tokens', async () => {
            const tx = await initializer.runTarget({
                contract: evmConfiguration,
                method: 'deployEvent',
                params: {
                    eventVoteData: {
                        ...eventVoteData,
                        eventTransaction: eventVoteData.eventTransaction + 1
                    },
                },
                value: locklift.utils.convertCrystal(6, 'nano')
            });

            logger.log(`Event initialization tx: ${tx.transaction.id}`);

            const expectedEventContract = await evmConfiguration.call({
                method: 'deriveEventAddress',
                params: {
                    eventVoteData: {
                        ...eventVoteData,
                        eventTransaction: eventVoteData.eventTransaction + 1
                    },
                }
            });

            logger.log(`Expected event address: ${expectedEventContract}`);

            eventContract = await locklift.factory.getContract('MultiVaultEVMEventAlien');
            eventContract.setAddress(expectedEventContract);
            eventContract.afterRun = afterRun;

            metricManager.addContract(eventContract);
        });

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

        it('Check event decoded data', async () => {
            const decodedData = await eventContract.call({
                method: 'getDecodedDataExtended',
            });

            expect(decodedData.proxy_)
                .to.be.equal(proxy.address, 'Event contract failed to fetch the proxy');
            expect(decodedData.token_)
                .to.be.equal(alienTokenRoot.address, 'Event contract failed to fetch the token');
            expect(decodedData.router_)
                .to.be.equal(mergeRouter.address, 'Merge router address invalid');

            expect(decodedData.pool_)
                .to.be.equal(mergePool.address, 'Wrong merge pool');
            expect(decodedData.canon_)
                .to.be.equal(canonTokenRoot.address, 'Wrong canon token');
            expect(decodedData.target_token_)
                .to.be.equal(alienTokenRoot.address, 'Target token should be canon');
            expect(decodedData.target_amount_)
                .to.be.bignumber.equal(amount, 'Target amount should be normalized by canon decimals');
        });

        it('Check user received alien tokens instead of canon', async () => {
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

            metricManager.addContract(initializerAlienTokenWallet);

            const balance = await initializerAlienTokenWallet.call({
                method: 'balance'
            });

            expect(balance)
                .to.be.bignumber.equal(amount, 'Initializer failed to receive alien tokens');
        });
    });
});
