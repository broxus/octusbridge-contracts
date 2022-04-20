const {
    setupRelays,
    setupBridge,
    logContract,
    expect
} = require("../../utils");
const BigNumber = require("bignumber.js");


describe('Test configuration factory', async function() {
    this.timeout(10000000);

    let bridge, bridgeOwner, staking, cellEncoder;

    it('Setup bridge', async () => {
        const relays = await setupRelays();

        [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);
    });

    describe('Test Ethereum event configuration', async () => {
        let factory;

        it('Setup Ethereum event configuration factory', async () => {
            const Factory = await locklift.factory.getContract('EthereumEverscaleEventConfigurationFactory');
            const Configuration = await locklift.factory.getContract('EthereumEverscaleEventConfiguration');

            const _randomNonce = locklift.utils.getRandomNonce();

            factory = await locklift.giver.deployContract({
                contract: Factory,
                constructorParams: {
                    _configurationCode: Configuration.code
                },
                initParams: {
                    _randomNonce,
                },
            });

            await logContract(factory);
        });

        let configuration;

        it('Deploy configuration', async () => {
            const EthereumEvent = await locklift.factory.getContract('TokenTransferEthereumEverscaleEvent');

            const basicConfiguration = {
                eventABI: '',
                eventInitialBalance: locklift.utils.convertCrystal('2', 'nano'),
                staking: staking.address,
                eventCode: EthereumEvent.code,
            };

            const networkConfiguration = {
                chainId: 12,
                eventEmitter: new BigNumber(0),
                eventBlocksToConfirm: 1,
                proxy: locklift.utils.zeroAddress,
                startBlockNumber: 0,
                endBlockNumber: 0,
            };

            await bridgeOwner.runTarget({
                contract: factory,
                method: 'deploy',
                params: {
                    _owner: bridgeOwner.address,
                    basicConfiguration,
                    networkConfiguration
                }
            });

            configuration = await locklift.factory.getContract('EthereumEverscaleEventConfiguration');
            configuration.address = (await factory.call({
                method: 'deriveConfigurationAddress',
                params: {
                    basicConfiguration,
                    networkConfiguration
                }
            }));

            await logContract(configuration);
        });

        it('Check configuration', async () => {
            const details = await configuration.call({ method: 'getDetails' });

            expect(details._basicConfiguration.staking)
                .to.be.equal(staking.address, 'Wrong staking');
            expect(details._networkConfiguration.chainId)
                .to.be.bignumber.equal(12, 'Wrong chain ID');
        });
    });

    describe('Test Solana event configuration', async () => {
        let factory;

        it('Setup Solana event configuration factory', async () => {
            const Factory = await locklift.factory.getContract('SolanaEverscaleEventConfigurationFactory');
            const Configuration = await locklift.factory.getContract('SolanaEverscaleEventConfiguration');

            const _randomNonce = locklift.utils.getRandomNonce();

            factory = await locklift.giver.deployContract({
                contract: Factory,
                constructorParams: {
                    _configurationCode: Configuration.code
                },
                initParams: {
                    _randomNonce,
                },
            });

            await logContract(factory);
        });

        let configuration;

        it('Deploy configuration', async () => {
            const SolanaEvent = await locklift.factory.getContract('TokenTransferSolanaEverscaleEvent');

            const basicConfiguration = {
                eventABI: '',
                eventInitialBalance: locklift.utils.convertCrystal('2', 'nano'),
                staking: staking.address,
                eventCode: SolanaEvent.code,
            };

            const networkConfiguration = {
                program: new BigNumber(0),
                settings: new BigNumber(0),
                proxy: locklift.utils.zeroAddress,
                endTimestamp: 0,
            };

            await bridgeOwner.runTarget({
                contract: factory,
                method: 'deploy',
                params: {
                    _owner: bridgeOwner.address,
                    basicConfiguration,
                    networkConfiguration
                }
            });

            configuration = await locklift.factory.getContract('SolanaEverscaleEventConfiguration');
            configuration.address = (await factory.call({
                method: 'deriveConfigurationAddress',
                params: {
                    basicConfiguration,
                    networkConfiguration
                }
            }));

            await logContract(configuration);
        });

        it('Check configuration', async () => {
            const details = await configuration.call({ method: 'getDetails' });

            expect(details._basicConfiguration.staking)
                .to.be.equal(staking.address, 'Wrong staking');
        });
    });
});