const {
    logContract
} = require("../test/utils");
const ora = require("ora");


async function main() {
    const _randomNonce = locklift.utils.getRandomNonce();

    const spinner = ora();

    spinner.start('Deploying Ethereum event configuration factory');

    const EthereumEverscaleEventConfigurationFactory = await locklift.factory.getContract('EthereumEverscaleEventConfigurationFactory');
    const EthereumEverscaleEventConfiguration = await locklift.factory.getContract('EthereumEverscaleEventConfiguration');

    const ethereumEverscaleEventConfigurationFactory = await locklift.giver.deployContract({
        contract: EthereumEverscaleEventConfigurationFactory,
        constructorParams: {
            _configurationCode: EthereumEverscaleEventConfiguration.code
        },
        initParams: {
            _randomNonce,
        },
    });

    spinner.stop();

    await logContract(ethereumEverscaleEventConfigurationFactory);


    // Everscale configuration factory
    const EverscaleEthereumEventConfigurationFactory = await locklift.factory.getContract('EverscaleEthereumEventConfigurationFactory');
    const EverscaleEthereumEventConfiguration = await locklift.factory.getContract('EverscaleEthereumEventConfiguration');

    spinner.start('Deploying Everscale event configuration factory');

    const everscaleEthereumEventConfigurationFactory = await locklift.giver.deployContract({
        contract: EverscaleEthereumEventConfigurationFactory,
        constructorParams: {
            _configurationCode: EverscaleEthereumEventConfiguration.code
        },
        initParams: {
            _randomNonce,
        },
    });

    spinner.stop();

    await logContract(everscaleEthereumEventConfigurationFactory);

    spinner.start('Deploying Solana event configuration factory');

    const SolanaEverscaleEventConfigurationFactory = await locklift.factory.getContract('SolanaEverscaleEventConfigurationFactory');
    const SolanaEverscaleEventConfiguration = await locklift.factory.getContract('SolanaEverscaleEventConfiguration');

    const solanaEverscaleEventConfigurationFactory = await locklift.giver.deployContract({
        contract: SolanaEverscaleEventConfigurationFactory,
        constructorParams: {
            _configurationCode: SolanaEverscaleEventConfiguration.code
        },
        initParams: {
            _randomNonce,
        },
    });

    spinner.stop();

    await logContract(solanaEverscaleEventConfigurationFactory);


    // Everscale configuration factory
    const EverscaleSolanaEventConfigurationFactory = await locklift.factory.getContract('EverscaleSolanaEventConfigurationFactory');
    const EverscaleSolanaEventConfiguration = await locklift.factory.getContract('EverscaleSolanaEventConfiguration');

    spinner.start('Deploying Everscale event configuration factory');

    const everscaleSolanaEventConfigurationFactory = await locklift.giver.deployContract({
        contract: EverscaleSolanaEventConfigurationFactory,
        constructorParams: {
            _configurationCode: EverscaleSolanaEventConfiguration.code
        },
        initParams: {
            _randomNonce,
        },
    });

    spinner.stop();

    await logContract(everscaleSolanaEventConfigurationFactory);

    // Proxy token transfer factory
    const ProxyTokenTransferFactory = await locklift.factory.getContract('ProxyTokenTransferFactory');
    const ProxyTokenTransfer = await locklift.factory.getContract('ProxyTokenTransfer');

    spinner.start('Deploying proxy token transfer factory');

    const proxyTokenTransferFactory = await locklift.giver.deployContract({
        contract: ProxyTokenTransferFactory,
        constructorParams: {
            _proxyCode: ProxyTokenTransfer.code
        },
        initParams: {
            _randomNonce,
        },
    });

    spinner.stop();

    await logContract(proxyTokenTransferFactory);
}


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
