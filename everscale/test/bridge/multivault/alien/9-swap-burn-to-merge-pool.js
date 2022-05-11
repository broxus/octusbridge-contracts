const {
    setupRelays,
    setupBridge,
    setupAlienMultiVault,
    logger,
    afterRun,
    expect,
    ...utils
} = require('./../../../utils');


describe('Swap tokens by burning in favor of merge pool', async function() {
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
            method: 'encodeMergePoolBurnSwapPayload',
            params: {
                targetToken: canonTokenRoot.address,
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

        logger.log(`Burn tx: ${tx.transaction.id}`);
    });

    it('Fetch initializer canon token wallet', async () => {
        const walletAddress = await canonTokenRoot.call({
            method: 'walletOf',
            params: {
                walletOwner: initializer.address
            }
        });

        initializerCanonTokenWallet = await locklift.factory.getContract('AlienTokenWalletUpgradeable');
        initializerCanonTokenWallet.name = 'Initializer canon token wallet';
        initializerCanonTokenWallet.setAddress(walletAddress);
        initializerCanonTokenWallet.afterRun = afterRun;

        expect(await locklift.ton.getBalance(walletAddress))
            .to.be.bignumber.greaterThan(0, 'Initializer token wallet balance is zero');

        metricManager.addContract(initializerCanonTokenWallet);
    });

    it('Check initializer canon token balance', async () => {
        const balance = await initializerCanonTokenWallet.call({
            method: 'balance'
        });

        expect(balance)
            .to.be.bignumber.equal(33, 'Wrong initializer token balance swap');
    });
});
