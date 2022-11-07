const ora = require('ora');
const prompts = require('prompts');

const {
    logContract,
    isValidTonAddress,
    afterRun,
    logger
} = require("../test/utils2");



const main = async () => {
    const response = await prompts([
        {
            type: 'text',
            name: 'owner',
            message: 'Initial proxy owner',
            validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address',
        },
        {
            type: 'number',
            name: 'value',
            message: 'Proxy initial balance',
            initial: 10
        }
    ]);


    const [keyPair] = await locklift.keys.getKeyPairs();

    const Account = await locklift.factory.getAccount('Wallet');
    const ProxyMultiVaultSolanaNative = await locklift.factory.getContract('ProxyMultiVaultSolanaNative');
    const ProxyMultiVaultSolanaAlien = await locklift.factory.getContract('ProxyMultiVaultSolanaAlien');
    const AlienTokenRoot = await locklift.factory.getContract('TokenRootAlienSolanaEverscale');
    const AlienTokenWalletUpgradeable = await locklift.factory.getContract('AlienTokenWalletUpgradeable');
    const AlienTokenWalletPlatform = await locklift.factory.getContract('AlienTokenWalletPlatform');


    const spinner = ora('Deploying native proxy').start();

    const proxyMultiVaultNative = await locklift.giver.deployContract({
        contract: ProxyMultiVaultSolanaNative,
        constructorParams: {
            owner_: response.owner,
        },
        initParams: {},
        keyPair
    }, locklift.utils.convertCrystal(response.value, 'nano'));

    spinner.stop();

    await logContract(proxyMultiVaultNative);

    // Deploy alien proxy
    // - Deploy temporary admin
    spinner.start('Deploying temporary owner for alien proxy');

    const user = await locklift.giver.deployContract({
        contract: Account,
        constructorParams: {},
        initParams: {},
        keyPair,
    }, locklift.utils.convertCrystal(30, 'nano'));

    user.afterRun = afterRun;
    user.setKeyPair(keyPair);

    spinner.stop();

    await logContract(user);

    spinner.start('Deploying alien proxy');

    const proxyMultiVaultAlien = await locklift.giver.deployContract({
        contract: ProxyMultiVaultSolanaAlien,
        constructorParams: {
            owner_: user.address,
        },
        initParams: {},
        keyPair
    }, locklift.utils.convertCrystal(response.value, 'nano'));

    spinner.stop();

    await logContract(proxyMultiVaultAlien);

    spinner.start('Setting token code at alien proxy');

    const setConfigurationTx = await user.runTarget({
       contract: proxyMultiVaultAlien,
       method: 'setConfiguration',
       params: {
           _config: {
               everscaleConfiguration: locklift.utils.zeroAddress,
               solanaConfiguration: locklift.utils.zeroAddress,
               deployWalletValue: locklift.utils.convertCrystal(0.1, 'nano'),
               alienTokenRootCode: AlienTokenRoot.code,
               alienTokenWalletCode: AlienTokenWalletUpgradeable.code,
               alienTokenWalletPlatformCode: AlienTokenWalletPlatform.code,
           },
           remainingGasTo: response.owner
       }
    });

    spinner.stop();

    logger.log(`Set configuration tx: ${setConfigurationTx.transaction.id}`);

    spinner.start('Transferring ownership at alien proxy');

    const transferOwnershipTx = await user.runTarget({
        contract: proxyMultiVaultAlien,
        method: 'transferOwnership',
        params: {
            newOwner: response.owner,
        },
    });

    spinner.stop();

    logger.log(`Transfer ownership tx: ${transferOwnershipTx.transaction.id}`);
};


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
