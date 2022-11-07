const {
    setupRelays,
    setupBridge,
    setupEthereumNativeMultiVault,
    expect,
    logger,
} = require("../../../../utils");


describe('Test Ethereum Native proxy upgrade', async function() {
    this.timeout(10000000);

    let relays, bridge, bridgeOwner, staking, cellEncoder;
    let evmConfiguration, everscaleConfiguration, proxy, initializer;

    it('Setup bridge', async () => {
        relays = await setupRelays();
        [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

        [evmConfiguration, everscaleConfiguration, proxy, initializer] = await setupEthereumNativeMultiVault(
            bridgeOwner,
            staking
        );
    });

    it('Check initial api version', async () => {
        expect(await proxy.call({ method: 'apiVersion' }))
            .to.be.bignumber.equal(1, 'Wrong api version');
    });

    it('Upgrade proxy to itself and check storage', async () => {
        const _configuration = await proxy.call({ method: 'getConfiguration' });

        const Proxy = await locklift.factory.getContract('ProxyMultiVaultEthereumNative');

        const tx = await bridgeOwner.runTarget({
            contract: proxy,
            method: 'upgrade',
            params: {
                code: Proxy.code
            }
        });

        logger.log(`Upgrade tx: ${tx.id}`);

        const configuration = await proxy.call({ method: 'getConfiguration' });

        expect(configuration.everscaleConfiguration)
            .to.be.equal(_configuration.everscaleConfiguration, 'Wrong everscale configuration');
        expect(configuration.evmConfigurations)
            .to.be.eql(_configuration.evmConfigurations, 'Wrong evm configurations');
        expect(configuration.deployWalletValue)
            .to.be.bignumber.equal(_configuration.deployWalletValue, 'Wrong deploy wallet value');
    });

    it('Check api version after upgrade', async () => {
        expect(await proxy.call({ method: 'apiVersion' }))
            .to.be.bignumber.equal(2, 'Wrong api version');
    });
});