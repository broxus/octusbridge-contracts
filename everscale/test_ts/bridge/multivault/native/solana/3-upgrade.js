const {
    setupRelays,
    setupBridge,
    setupSolanaNativeMultiVault,
    expect,
    logger,
} = require("../../../../utils");


describe('Test Solana Native proxy upgrade', async function() {
    this.timeout(10000000);

    let relays, bridge, bridgeOwner, staking, cellEncoder;
    let solanaConfiguration, everscaleConfiguration, proxy, initializer;

    it('Setup bridge', async () => {
        relays = await setupRelays();
        [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

        [solanaConfiguration, everscaleConfiguration, proxy, initializer] = await setupSolanaNativeMultiVault(
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

        const Proxy = await locklift.factory.getContract('ProxyMultiVaultSolanaNative');

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
        expect(configuration.solanaConfiguration)
            .to.be.eql(_configuration.solanaConfiguration, 'Wrong solana configuration');
        expect(configuration.deployWalletValue)
            .to.be.bignumber.equal(_configuration.deployWalletValue, 'Wrong deploy wallet value');
    });

    it('Check api version after upgrade', async () => {
        expect(await proxy.call({ method: 'apiVersion' }))
            .to.be.bignumber.equal(2, 'Wrong api version');
    });
});