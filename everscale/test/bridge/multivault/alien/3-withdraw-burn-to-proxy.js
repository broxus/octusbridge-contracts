const {
    setupRelays,
    setupBridge,
    setupAlienMultiVault,
    logger,
    afterRun,
    expect,
    ...utils
} = require('./../../../utils');


describe('Transfer alien token from Everscale to EVM', async function() {
    this.timeout(10000000);

    let eventContract;

    let metricManager;
    let relays, bridge, bridgeOwner, staking, cellEncoder;
    let evmConfiguration, everscaleConfiguration, proxy, initializer;

    const amount = 333;
    const recipient = 888;

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

    it('Pre-deploy Alien token root', async () => {

    });

    it('Mint tokens to initializer', async () => {

    });

    it('Burn tokens in favor of Alien Proxy', async () => {
        const burnPayload = await cellEncoder.call({
            method: 'encodeAlienBurnPayload',
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

        expect(decodedData.base_chainId_)
            .to.be.bignumber.equal(alienTokenBase.chainId, 'Wrong alien base chain ID');
        expect(decodedData.base_token_)
            .to.be.bignumber.equal(alienTokenBase.token, 'Wrong alien base token');

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
            .to.be.bignumber.equal(alienTokenBase.token, 'Wrong event data base token');
        expect(decodedEventData.base_chainId)
            .to.be.bignumber.equal(alienTokenBase.chainId, 'Wrong event data base chain id');
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
