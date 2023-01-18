const {
    setupRelays,
    setupBridge,
    setupAlienMultiVault,
    logger, expect, afterRun,
    deployTokenRoot,
    ...utils
} = require("./../../../utils");


const alienTokenMeta = {
    chainId: 111,
    token: 222,
    name: 'Giga Chad',
    symbol: 'GIGA_CHAD',
    decimals: 6,
};


const recipient = 888;


describe('Deposit and withdraw custom token', async function() {
    this.timeout(10000000);

    let metricManager;
    let relays, bridge, bridgeOwner, staking, cellEncoder;
    let evmConfiguration, everscaleConfiguration, proxy, initializer;

    let alienTokenRoot, mergeRouter, initializerAlienTokenWallet;
    let customTokenRoot, mergePool, initializerCustomTokenWallet;

    let proxyManager;

    let eventDataStructure;
    let eventDataEncoded;
    let eventVoteData;
    let eventContract;

    const amount = 10000;

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

    it('Deploy custom canon token', async () => {
        // 9 decimals
        customTokenRoot = await deployTokenRoot(
            alienTokenMeta.name,
            alienTokenMeta.symbol,
            proxy
        );

        customTokenRoot.name = 'Custom token root';

        await utils.logContract(customTokenRoot);

        metricManager.addContract(customTokenRoot);
    });

    it('Deploy merge pool', async () => {
        const nonce = locklift.utils.getRandomNonce();

        const tx = await proxyManager.runTarget({
            contract: proxy,
            method: 'deployMergePool',
            params: {
                nonce,
                tokens: [alienTokenRoot.address, customTokenRoot.address],
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

    it('Enable merge pool tokens', async () => {
        await proxyManager.runTarget({
            contract: mergePool,
            method: 'enableAll',
            params: {}
        });

        const tokens = await mergePool.call({ method: 'getTokens' });

        expect(tokens._tokens[alienTokenRoot.address].enabled)
            .to.be.equal(true, 'Wrong alien status in merge pool');
        expect(tokens._tokens[customTokenRoot.address].enabled)
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

    describe('Deposit alien token and receive custom', async () => {
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
                value: 10000,
                expected_evers: 1000,
                payload: ''
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
                .to.be.equal(customTokenRoot.address, 'Wrong canon token');
            expect(decodedData.target_token_)
                .to.be.equal(customTokenRoot.address, 'Target token should be canon');
            expect(decodedData.target_amount_)
                .to.be.bignumber.equal(amount * 1000, 'Target amount should be normalized by canon decimals');
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

        it('Check alien total supply is zero', async () => {
            const totalSupply = await alienTokenRoot.call({
                method: 'totalSupply'
            });

            expect(totalSupply)
                .to.be.bignumber.equal(0, 'Wrong total supply');
        });

        it('Check canon total supply', async () => {
            const totalSupply = await customTokenRoot.call({
                method: 'totalSupply'
            });

            expect(totalSupply)
                .to.be.bignumber.equal(amount * 1000, 'Wrong total supply');
        });

        it('Check initializer token wallet exists', async () => {
            const walletAddress = await customTokenRoot.call({
                method: 'walletOf',
                params: {
                    walletOwner: initializer.address
                }
            });

            initializerCustomTokenWallet = await locklift.factory.getContract('AlienTokenWalletUpgradeable');
            initializerCustomTokenWallet.name = 'Initializer custom token wallet';
            initializerCustomTokenWallet.setAddress(walletAddress);
            initializerCustomTokenWallet.afterRun = afterRun;

            expect(await locklift.ton.getBalance(walletAddress))
                .to.be.bignumber.greaterThan(0, 'Initializer token wallet balance is zero');

            metricManager.addContract(initializerCustomTokenWallet);
        });

        it('Check initializer received tokens', async () => {
            const balance = await initializerCustomTokenWallet.call({
                method: 'balance'
            });

            expect(balance)
                .to.be.bignumber.equal(amount * 1000, 'Initializer failed to receive tokens');
        });
    });

    describe('Withdraw custom token', async () => {
        it('Burn tokens in favor of merge pool', async () => {
            const burnPayload = await cellEncoder.call({
                method: 'encodeMergePoolBurnWithdrawPayload',
                params: {
                    targetToken: alienTokenRoot.address,
                    recipient,
                    callback: {
                        recipient: 0,
                        payload: '',
                        strict: false
                    }
                }
            });

            const tx = await initializer.runTarget({
                contract: initializerCustomTokenWallet,
                method: 'burn',
                params: {
                    amount,
                    remainingGasTo: initializer.address,
                    callbackTo: mergePool.address,
                    payload: burnPayload,
                },
                value: locklift.utils.convertCrystal(10, 'nano')
            });

            logger.log(`Burn tx: ${tx.transaction.id}`);

            const events = await everscaleConfiguration.getEvents('NewEventContract');

            expect(events)
                .to.have.lengthOf(1, 'Everscale event configuration should not deploy event');
        });
    });
});
