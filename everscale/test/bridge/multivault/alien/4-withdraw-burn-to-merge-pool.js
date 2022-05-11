const {
    setupRelays,
    setupBridge,
    setupAlienMultiVault,
    logger,
    afterRun,
    expect,
    ...utils
} = require('./../../../utils');


describe('Withdraw tokens by burning in favor of merge pool', async function() {
    this.timeout(10000000);

    let eventContract;

    let metricManager;
    let relays, bridge, bridgeOwner, staking, cellEncoder;
    let evmConfiguration, everscaleConfiguration, proxy, initializer;

    const mintAmount = 1000;
    const amount = 333;
    const recipient = 888;

    let alienTokenRoot, initializerAlienTokenWallet;
    let mergeRouter;
    let canonTokenRoot, mergePool, initializerCanonTokenWallet;

    let proxyManager;

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
    it('Mint tokens to initializer', async () => {
        await bridgeOwner.runTarget({
            contract: proxy,
            method: 'mint',
            params: {
                amount: mintAmount,
                token: alienTokenRoot.address,
                recipient: initializer.address
            }
        });
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

        metricManager.addContract(initializerAlienTokenWallet);
    });

    it('Check initializer token balance', async () => {
        const balance = await initializerAlienTokenWallet.call({
            method: 'balance'
        });

        expect(balance)
            .to.be.bignumber.equal(mintAmount, 'Wrong initializer token balance after mint');
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

        await proxyManager.runTarget({
            contract: proxy,
            method: 'deployMergePool',
            params: {
                nonce,
                tokens: [alienTokenRoot.address, canonTokenRoot.address],
                canonId: 1
            }
        });

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

    it('Check merge pool', async () => {
        const tokens = await mergePool.call({ method: 'getTokens' });

        expect(tokens._canon)
            .to.be.equal(canonTokenRoot.address, 'Wrong canon token in merge pool');

        expect(tokens._tokens[alienTokenRoot.address])
            .to.be.bignumber.equal(alienTokenMeta.decimals, 'Wrong alien decimals in merge pool');
        expect(tokens._tokens[canonTokenRoot.address])
            .to.be.bignumber.equal(canonTokenMeta.decimals, 'Wrong canon decimals in merge pool');
    });

    it('Burn tokens in favor of Alien Proxy', async () => {
        const burnPayload = await cellEncoder.call({
            method: 'encodeMergePoolBurnWithdrawPayload',
            params: {
                targetToken: canonTokenRoot.address,
                recipient
            }
        });

        const tx = await initializer.runTarget({
            contract: initializerAlienTokenWallet,
            method: 'burn',
            params: {
                amount,
                remainingGasTo: initializer.address,
                callbackTo: mergePool.address,
                payload: burnPayload,
            },
            value: locklift.utils.convertCrystal(10, 'nano')
        });

        logger.log(`Event initialization tx: ${tx.transaction.id}`);

        const events = await everscaleConfiguration.getEvents('NewEventContract');

        expect(events)
            .to.have.lengthOf(1, 'Everscale event configuration failed to deploy event');

        const [{
            value: {
                eventContract: expectedEventContract
            }
        }] = events;

        logger.log(`Expected event address: ${expectedEventContract}`);

        eventContract = await locklift.factory.getContract('MultiVaultEverscaleEventAlien');
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
            .to.be.bignumber.equal(mintAmount - amount, 'Wrong total supply');
    });

    it('Check initializer token wallet balance', async () => {
        const balance = await initializerAlienTokenWallet.call({
            method: 'balance'
        });

        expect(balance)
            .to.be.bignumber.equal(mintAmount - amount, 'Initializer failed to burn tokens');
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

        expect(decodedData.base_chainId_)
            .to.be.bignumber.equal(canonTokenMeta.chainId, 'Wrong alien base chain ID');
        expect(decodedData.base_token_)
            .to.be.bignumber.equal(canonTokenMeta.token, 'Wrong alien base token');

        const eventInitData = await eventContract.call({
            method: 'getEventInitData'
        });

        const decodedEventData = await cellEncoder.call({
            method: 'decodeMultiVaultAlienEverscale',
            params: {
                data: eventInitData.voteData.eventData
            }
        });

        expect(decodedEventData.base_token)
            .to.be.bignumber.equal(canonTokenMeta.token, 'Wrong event data base token');
        expect(decodedEventData.base_chainId)
            .to.be.bignumber.equal(canonTokenMeta.chainId, 'Wrong event data base chain id');
        expect(decodedEventData.amount)
            .to.be.bignumber.equal(33, 'Wrong event data amount');
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
