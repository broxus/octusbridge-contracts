const {
    logger,
    setupRelays,
    setupBridge,
    setupAlienMultiVault,
    afterRun,
    expect,
    ...utils
} = require("./../../../utils");


describe('Pass alien tokens through the hidden bridge', async function() {
    this.timeout(10000000);

    let metricManager;
    let relays, bridge, bridgeOwner, staking, cellEncoder;
    let evmConfiguration, everscaleConfiguration, proxy, initializer;
    let alienTokenRoot;
    let mediator;

    let eventDataStructure;
    let eventDataEncoded;
    let eventVoteData;
    let eventContract;

    const amount = 10000;

    const recipient = 333;

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

    it('Deploy mediator', async () => {
        const _randomNonce = locklift.utils.getRandomNonce();

        const Mediator = await locklift.factory.getContract('Mediator');

        const alienTokenWalletPlatformCode = await locklift.factory.getContract('AlienTokenWalletPlatform');

        mediator = await locklift.giver.deployContract({
            contract: Mediator,
            constructorParams: {
                _owner: bridgeOwner.address,
                _alienTokenWalletPlatformCode: alienTokenWalletPlatformCode.code
            },
            initParams: {
                _randomNonce,
            },
        }, locklift.utils.convertCrystal(1, 'nano'));

        mediator.name = 'Hidden bridge mediator';

        metricManager.addContract(mediator);

        await utils.logContract(mediator);
    });

    it('Initialize event', async () => {
        const burnPayload = await cellEncoder.call({
            method: 'encodeAlienBurnPayload',
            params: {
                recipient,
                callback: {
                    recipient: 0,
                    payload: '',
                    strict: false
                }
            }
        });

        const mediatorPayload = await cellEncoder.call({
            method: 'encodeAlienHiddenBridgeEventPayload',
            params: {
                proxy: proxy.address,
                burnPayload: burnPayload
            }
        });

        eventDataStructure = {
            base_chainId: alienTokenBase.chainId,
            base_token: alienTokenBase.token,
            ...tokenMeta,
            amount,
            recipient_wid: mediator.address.split(':')[0],
            recipient_addr: `0x${mediator.address.split(':')[1]}`,
            value: 10000,
            expected_evers: 1000,
            payload: mediatorPayload
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

    it('Check Everscale event contract created', async () => {
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
    });

    it('Check withdraw event contract details', async () => {

    });

    it('Check event data after mutation', async () => {
        const decodedData = await eventContract.call({
            method: 'getDecodedData'
        });

        expect(decodedData.recipient_)
            .to.be.bignumber.equal(recipient, 'Wrong recipient');
        expect(decodedData.base_chainId_)
            .to.be.bignumber.equal(alienTokenBase.chainId, 'Wrong token chain ID');
        expect(decodedData.base_token_)
            .to.be.bignumber.equal(alienTokenBase.token, 'Wrong token address');
    });
});
