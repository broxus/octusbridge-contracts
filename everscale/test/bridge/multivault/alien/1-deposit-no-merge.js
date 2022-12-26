const {
    setupRelays,
    setupBridge,
    setupAlienMultiVault,
    logger,
    afterRun,
    expect,
    ...utils
} = require('./../../../utils');


describe('Deposit Alien token from EVM to Everscale with no merging', async function() {
    this.timeout(10000000);

    let metricManager;
    let relays, bridge, bridgeOwner, staking, cellEncoder;
    let evmConfiguration, everscaleConfiguration, proxy, initializer;
    let alienTokenRoot, mergeRouter, initializerAlienTokenWallet;

    let eventDataStructure;
    let eventDataEncoded;
    let eventVoteData;
    let eventContract;

    const alienTokenBase = {
        chainId: 111,
        token: 222,
    };

    const tokenMeta = {
        name: 'Giga Chad',
        symbol: 'GIGA_CHAD',
        decimals: 6,
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

    it('Set proxy manager', async () => {
        await bridgeOwner.runTarget({
            contract: proxy,
            method: 'setManager',
            params: {
                _manager: initializer.address
            }
        });

        expect(await proxy.call({ method: 'manager' }))
            .to.be.equal(initializer.address, 'Wrong manager in alien proxy');
    });

    it('Initialize event', async () => {
        eventDataStructure = {
            base_chainId: alienTokenBase.chainId,
            base_token: alienTokenBase.token,
            ...tokenMeta,
            amount: 333,
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
            method: 'deployEvents',
            params: {
                eventsVoteData: [eventVoteData],
                values: [locklift.utils.convertCrystal(6, 'nano')]
            },
            value: locklift.utils.convertCrystal(10, 'nano')
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

    it('Check event status', async () => {
        const status = await eventContract.call({ method: 'status' });

        expect(status)
            .to.be.bignumber.equal(1, 'Wrong status');
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

    it('Fetch alien token', async () => {
        const tokenAddress = await proxy.call({
            method: 'deriveAlienTokenRoot',
            params: {
                chainId: eventDataStructure.base_chainId,
                token: eventDataStructure.base_token,
                name: eventDataStructure.name,
                symbol: eventDataStructure.symbol,
                decimals: eventDataStructure.decimals,
            }
        });

        alienTokenRoot = await locklift.factory.getContract('TokenRootAlienEVM');
        alienTokenRoot.setAddress(tokenAddress);
        alienTokenRoot.afterRun = afterRun;

        await utils.logContract(alienTokenRoot);

        metricManager.addContract(alienTokenRoot);
    });

    it('Check alien token root exists', async () => {
        expect(await locklift.ton.getBalance(alienTokenRoot.address))
            .to.be.bignumber.greaterThan(0, 'Alien token root balance is zero');
    });

    it('Check alien token root meta', async () => {
        const meta = await alienTokenRoot.call({
            method: 'meta',
        });

        expect(meta.base_chainId)
            .to.be.bignumber.equal(eventDataStructure.base_chainId, 'Wrong alien token base chain id');
        expect(meta.base_token)
            .to.be.bignumber.equal(eventDataStructure.base_token, 'Wrong alien token base token');
        expect(meta.name)
            .to.be.equal(eventDataStructure.name, 'Wrong alien token name');
        expect(meta.symbol)
            .to.be.equal(eventDataStructure.symbol, 'Wrong alien token symbol');
        expect(meta.decimals)
            .to.be.bignumber.equal(eventDataStructure.decimals, 'Wrong alien token decimals');

        expect(await alienTokenRoot.call({ method: 'rootOwner' }))
            .to.be.equal(proxy.address, 'Wrong alien token owner');
    });

    it('Fetch merge router', async () => {
        const mergeRouterAddress = await proxy.call({
            method: 'deriveMergeRouter',
            params: {
                token: alienTokenRoot.address,
            }
        });

        mergeRouter = await locklift.factory.getContract('MergeRouter');
        mergeRouter.setAddress(mergeRouterAddress);
        mergeRouter.afterRun = afterRun;

        await utils.logContract(mergeRouter);

        metricManager.addContract(mergeRouter);
    });

    it('Check merge router exists', async () => {
        expect(await locklift.ton.getBalance(mergeRouter.address))
            .to.be.bignumber.greaterThan(0, 'Alien merge router balance is zero');
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
            .to.be.equal(locklift.utils.zeroAddress, 'Merge pool should be zero address');
        expect(decodedData.canon_)
            .to.be.equal(locklift.utils.zeroAddress, 'Merge canon should be zero address');
        expect(decodedData.target_token_)
            .to.be.equal(alienTokenRoot.address, 'Target token should be same as derived');
        expect(decodedData.target_amount_)
            .to.be.bignumber.equal(eventDataStructure.amount, 'Target amount should be same');
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
