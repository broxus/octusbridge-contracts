const {
    logContract
} = require("../test/utils");
const ora = require("ora");


async function main() {
    const _randomNonce = locklift.utils.getRandomNonce();

    const spinner = ora();

    spinner.start('Deploying Ethereum event configuration factory');

    const EthereumEventConfigurationFactory = await locklift.factory.getContract('EthereumEventConfigurationFactory');
    const EthereumEventConfiguration = await locklift.factory.getContract('EthereumEventConfiguration');

    const ethereumEventConfigurationFactory = await locklift.giver.deployContract({
        contract: EthereumEventConfigurationFactory,
        constructorParams: {
            _configurationCode: EthereumEventConfiguration.code
        },
        initParams: {
            _randomNonce,
        },
    });

    spinner.stop();

    await logContract(ethereumEventConfigurationFactory);


    // Everscale configuration factory
    const EverscaleEventConfigurationFactory = await locklift.factory.getContract('EverscaleEventConfigurationFactory');
    const EverscaleEventConfiguration = await locklift.factory.getContract('EverscaleEventConfiguration');

    spinner.start('Deploying Everscale event configuration factory');

    const everscaleEventConfigurationFactory = await locklift.giver.deployContract({
        contract: EverscaleEventConfigurationFactory,
        constructorParams: {
            _configurationCode: EverscaleEventConfiguration.code
        },
        initParams: {
            _randomNonce,
        },
    });

    spinner.stop();

    await logContract(everscaleEventConfigurationFactory);

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
