export {};
const ora = require('ora');
const prompts = require('prompts');

const {zeroAddress} = require("locklift");
const {
    logContract,
    isValidTonAddress,
    deployAccount,
    logger
} = require('./../test_ts/utils');


const main = async () => {
    const response = await prompts([
        {
            type: 'text',
            name: 'owner',
            message: 'Initial proxy owner',
            validate: (value: any) => isValidTonAddress(value) ? true : 'Invalid Everscale address',
        },
        {
            type: 'number',
            name: 'value',
            message: 'Proxy initial balance',
            initial: 10
        }
    ]);

    const signer = (await locklift.keystore.getSigner("0"))!;

    const spinner = ora('Deploying native proxy').start();

    const {contract: proxyMultiVaultNative} = await locklift.factory.deployContract({
        contract: 'ProxyMultiVaultEthereumNative',
        constructorParams: {
            owner_: response.owner,
        },
        initParams: {_randomNonce: locklift.utils.getRandomNonce()},
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(response.value)
    });

    spinner.stop();

    await logContract("proxyMultiVaultNative address" , proxyMultiVaultNative.address);

    // Deploy alien proxy
    // - Deploy temporary admin
    spinner.start('Deploying temporary owner for alien proxy');

    const user = await deployAccount(signer, 30);

    spinner.stop();

    await logContract("user address" , user.address);

    spinner.start('Deploying alien proxy');

    const {contract: proxyMultiVaultAlien}  = await locklift.factory.deployContract({
        contract: 'ProxyMultiVaultEthereumAlien',
        constructorParams: {
            owner_: user.address,
        },
        initParams: {_randomNonce: locklift.utils.getRandomNonce()},
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(response.value)
    });

    spinner.stop();

    await logContract("proxyMultiVaultAlien address" , proxyMultiVaultAlien.address);

    spinner.start('Setting token code at alien proxy');

    const AlienTokenRoot = await locklift.factory.getContractArtifacts('TokenRootAlienSolanaEverscale');
    const AlienTokenWalletUpgradeable = await locklift.factory.getContractArtifacts('AlienTokenWalletUpgradeable');
    const AlienTokenWalletPlatform = await locklift.factory.getContractArtifacts('AlienTokenWalletPlatform');

    const setConfigurationTx = await proxyMultiVaultAlien.methods.setConfiguration({
        _config: {
            everscaleConfiguration: zeroAddress,
            evmConfigurations: [],
            deployWalletValue: locklift.utils.toNano(0.1),
            alienTokenRootCode: AlienTokenRoot.code,
            alienTokenWalletCode: AlienTokenWalletUpgradeable.code,
            alienTokenWalletPlatformCode: AlienTokenWalletPlatform.code,
        },
        remainingGasTo: response.owner
    }).send({
        from: user.address,
        amount: locklift.utils.toNano(0.5),
    });

    spinner.stop();

    logger.log(`Set configuration tx: ${setConfigurationTx.id}`);

    spinner.start('Transferring ownership at alien proxy');

    const transferOwnershipTx = await proxyMultiVaultAlien.methods.transferOwnership({
        newOwner: response.owner,
    }).send({
        from: user.address,
        amount: locklift.utils.toNano(1),
    });

    spinner.stop();

    logger.log(`Transfer ownership tx: ${transferOwnershipTx.id}`);
};


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
