async function main() {
    const TokenTransferEthereumEverscaleEvent = await locklift.factory.getContract('TokenTransferEthereumEverscaleEvent');
    console.log('TokenTransferEthereumEverscaleEvent');
    console.log('');
    console.log(TokenTransferEthereumEverscaleEvent.code);
    console.log('');

    const TokenTransferEverscaleEthereumEvent = await locklift.factory.getContract('TokenTransferEverscaleEthereumEvent');
    console.log('TokenTransferEverscaleEthereumEvent');
    console.log('');
    console.log(TokenTransferEverscaleEthereumEvent.code);
    console.log('');

    const DaoEthereumActionEvent = await locklift.factory.getContract('DaoEthereumActionEvent');
    console.log('DaoEthereumActionEvent');
    console.log('');
    console.log(DaoEthereumActionEvent.code);
    console.log('');

    const StakingEthereumEverscaleEvent = await locklift.factory.getContract('StakingEthereumEverscaleEvent');
    console.log('StakingEthereumEverscaleEvent');
    console.log('');
    console.log(StakingEthereumEverscaleEvent.code);
    console.log('');

    const StakingEverscaleEthereumEvent = await locklift.factory.getContract('StakingEverscaleEthereumEvent');
    console.log('StakingEverscaleEthereumEvent');
    console.log('');
    console.log(StakingEverscaleEthereumEvent.code);
    console.log('');
}


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
