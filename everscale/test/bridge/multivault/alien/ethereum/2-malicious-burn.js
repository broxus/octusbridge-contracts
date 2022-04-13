const {
    logger,
    setupRelays,
    setupBridge,
    setupEthereumAlienMultiVault,
    expect,
    afterRun,
    ...utils
} = require("./../../../../utils");


describe('Test event contract behaviour when Alien token is incorrect', async function() {
    this.timeout(10000000);

    let relays, bridge, bridgeOwner, staking, cellEncoder;
    let evmConfiguration, everscaleConfiguration, proxy, initializer;

    it('Setup bridge', async () => {
        relays = await setupRelays();
        [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

        [evmConfiguration, everscaleConfiguration, proxy, initializer] = await setupEthereumAlienMultiVault(
            bridgeOwner,
            staking,
            cellEncoder
        );
    });

    describe('Call proxy burn callback from arbitrary account', async () => {
        const recipient = 888;
        const amount = 100;

        let eventContract;

        it('Call burn callback on proxy', async () => {
            const burnPayload = await cellEncoder.call({
                method: 'encodeAlienBurnPayloadEthereum',
                params: {
                    recipient
                }
            });

            const tx = await initializer.runTarget({
                contract: proxy,
                method: 'onAcceptTokensBurn',
                params: {
                    amount,
                    value1: initializer.address,
                    value2: initializer.address,
                    remainingGasTo: initializer.address,
                    payload: burnPayload
                },
                value: locklift.utils.convertCrystal(10, 'nano')
            });

            logger.log(`Burn tx: ${tx.transaction.id}`);

            const events = await everscaleConfiguration.getEvents('NewEventContract');

            expect(events)
                .to.have.lengthOf(1, 'Everscale event configuration failed to deploy event');

            const [{
                value: {
                    eventContract: expectedEventContract
                }
            }] = events;

            logger.log(`Expected event address: ${expectedEventContract}`);

            eventContract = await locklift.factory.getContract('MultiVaultEverscaleEVMEventAlien');
            eventContract.setAddress(expectedEventContract);
            eventContract.afterRun = afterRun;
        });

        it('Check event contract rejected and relays are loaded', async () => {
            const details = await eventContract.call({
                method: 'getDetails'
            });

            expect(details._status)
                .to.be.bignumber.equal(3, 'Event contract should be Rejected');
            expect(details._requiredVotes)
                .to.be.bignumber.not.equal(0, 'Event contract failed to load relays');
        });
    });
});