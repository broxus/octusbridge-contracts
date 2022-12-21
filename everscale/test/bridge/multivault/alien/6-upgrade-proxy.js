const {
    expect,
    logger,
    logContract,
    ...utils
} = require("./../../../utils");


describe('Test Alien proxy upgrade', async function() {
    this.timeout(10000000);

    let proxy, owner;

    it('Setup proxy V1', async () => {
        const [keyPair] = await locklift.keys.getKeyPairs();

        owner = await utils.deployAccount(keyPair, 10);

        const Proxy = await locklift.factory.getContract('ProxyMultiVaultAlien_V1');

        proxy = await locklift.giver.deployContract({
            contract: Proxy,
            constructorParams: {
                owner_: owner.address,
            },
            initParams: {},
            keyPair
        }, locklift.utils.convertCrystal(2, 'nano'));

        await logContract(proxy);
    });

    it('Set dummy configuration', async () => {
        const AlienTokenRoot = await locklift.factory.getContract('TokenRootAlienEVM');
        const AlienTokenWalletUpgradeable = await locklift.factory.getContract('AlienTokenWalletUpgradeable');
        const AlienTokenWalletPlatform = await locklift.factory.getContract('AlienTokenWalletPlatform');

        await owner.runTarget({
            contract: proxy,
            method: 'setConfiguration',
            params: {
                _config: {
                    everscaleConfiguration: owner.address,
                    evmConfigurations: [locklift.utils.zeroAddress, owner.address],
                    deployWalletValue: locklift.utils.convertCrystal(1, 'nano'),
                    alienTokenRootCode: AlienTokenRoot.code,
                    alienTokenWalletCode: AlienTokenWalletUpgradeable.code,
                    alienTokenWalletPlatformCode: AlienTokenWalletPlatform.code,
                },
                remainingGasTo: owner.address
            }
        })
    });

    it('Check api version', async () => {
        expect(await proxy.call({ method: 'apiVersion' }))
            .to.be.bignumber.equal(1, 'Wrong api version');
    });

    it('Upgrade proxy to V2', async () => {
        const _configuration = await proxy.call({ method: 'getConfiguration' });
        const _owner = await proxy.call({ method: 'owner' });

        const Proxy = await locklift.factory.getContract('ProxyMultiVaultAlien_V2');

        const tx = await owner.runTarget({
            contract: proxy,
            method: 'upgrade',
            params: {
                code: Proxy.code
            }
        });

        proxy.abi = Proxy.abi;

        logger.log(`Upgrade tx: ${tx.transaction.id}`);

        const configuration = await proxy.call({ method: 'getConfiguration' });

        expect(configuration.everscaleConfiguration)
            .to.be.equal(_configuration.everscaleConfiguration, 'Wrong everscale configuration');
        expect(configuration.evmConfigurations)
            .to.be.eql(_configuration.evmConfigurations, 'Wrong evm configurations');
        expect(configuration.deployWalletValue)
            .to.be.bignumber.equal(_configuration.deployWalletValue, 'Wrong deploy wallet value');

        expect(configuration.alienTokenRootCode)
            .to.be.equal(_configuration.alienTokenRootCode, 'Wrong alien token root code');
        expect(configuration.alienTokenWalletCode)
            .to.be.equal(_configuration.alienTokenWalletCode, 'Wrong alien token wallet code');
        expect(configuration.alienTokenWalletPlatformCode)
            .to.be.equal(_configuration.alienTokenWalletPlatformCode, 'Wrong alien token wallet platform code');

        expect(await proxy.call({ method: 'owner' }))
            .to.be.equal(_owner, 'Wrong owner after upgrade');
    });

    it('Check api version', async () => {
        expect(await proxy.call({ method: 'apiVersion' }))
            .to.be.bignumber.equal(2, 'Wrong api version');
    });

    it('Upgrade proxy to V3', async () => {
        const _configuration = await proxy.call({ method: 'getConfiguration' });
        const _owner = await proxy.call({ method: 'owner' });

        const Proxy = await locklift.factory.getContract('ProxyMultiVaultAlien_V3');

        const tx = await owner.runTarget({
            contract: proxy,
            method: 'upgrade',
            params: {
                code: Proxy.code
            }
        });

        proxy.abi = Proxy.abi;

        logger.log(`Upgrade tx: ${tx.transaction.id}`);

        const configuration = await proxy.call({ method: 'getConfiguration' });

        expect(configuration.everscaleConfiguration)
            .to.be.equal(_configuration.everscaleConfiguration, 'Wrong everscale configuration');
        expect(configuration.evmConfigurations)
            .to.be.eql(_configuration.evmConfigurations, 'Wrong evm configurations');
        expect(configuration.deployWalletValue)
            .to.be.bignumber.equal(_configuration.deployWalletValue, 'Wrong deploy wallet value');

        expect(configuration.alienTokenRootCode)
            .to.be.equal(_configuration.alienTokenRootCode, 'Wrong alien token root code');
        expect(configuration.alienTokenWalletCode)
            .to.be.equal(_configuration.alienTokenWalletCode, 'Wrong alien token wallet code');
        expect(configuration.alienTokenWalletPlatformCode)
            .to.be.equal(_configuration.alienTokenWalletPlatformCode, 'Wrong alien token wallet platform code');

        expect(await proxy.call({ method: 'owner' }))
            .to.be.equal(_owner, 'Wrong owner after upgrade');

        expect(await proxy.call({ method: 'manager' }))
            .to.be.equal(locklift.utils.zeroAddress, 'Wrong manager');
    });

    it('Check api version', async () => {
        expect(await proxy.call({ method: 'apiVersion' }))
            .to.be.bignumber.equal(3, 'Wrong api version');
    });

    it('Set manager', async () => {
        await owner.runTarget({
            contract: proxy,
            method: 'setManager',
            params: {
                _manager: owner.address
            }
        });

        expect(await proxy.call({ method: 'manager' }))
            .to.be.equal(owner.address, 'Wrong manager');

        await logContract(proxy);
    });

    it('Upgrade proxy to V4', async () => {
        const _configuration = await proxy.call({ method: 'getConfiguration' });
        const _owner = await proxy.call({ method: 'owner' });

        const Proxy = await locklift.factory.getContract('ProxyMultiVaultAlien_V4');

        const tx = await owner.runTarget({
            contract: proxy,
            method: 'upgrade',
            params: {
                code: Proxy.code
            }
        });

        proxy.abi = Proxy.abi;

        logger.log(`Upgrade tx: ${tx.transaction.id}`);

        const configuration = await proxy.call({ method: 'getConfiguration' });

        expect(configuration.everscaleConfiguration)
            .to.be.equal(_configuration.everscaleConfiguration, 'Wrong everscale configuration');
        expect(configuration.evmConfigurations)
            .to.be.eql(_configuration.evmConfigurations, 'Wrong evm configurations');
        expect(configuration.deployWalletValue)
            .to.be.bignumber.equal(_configuration.deployWalletValue, 'Wrong deploy wallet value');

        expect(configuration.alienTokenRootCode)
            .to.be.equal(_configuration.alienTokenRootCode, 'Wrong alien token root code');
        expect(configuration.alienTokenWalletCode)
            .to.be.equal(_configuration.alienTokenWalletCode, 'Wrong alien token wallet code');
        expect(configuration.alienTokenWalletPlatformCode)
            .to.be.equal(_configuration.alienTokenWalletPlatformCode, 'Wrong alien token wallet platform code');

        expect(await proxy.call({ method: 'owner' }))
            .to.be.equal(_owner, 'Wrong owner after upgrade');
    });

    it('Check API version', async () => {
        expect(await proxy.call({ method: 'apiVersion' }))
            .to.be.bignumber.equal(4, 'Wrong api version');
    });
});
