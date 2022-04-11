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

    const StakingEthEvent = await locklift.factory.getContract('StakingEthEvent');
    console.log('StakingEthEvent');
    console.log('');
    console.log(StakingEthEvent.code);
    console.log('');

    const StakingTonEvent = await locklift.factory.getContract('StakingTonEvent');
    console.log('StakingTonEvent');
    console.log('');
    console.log(StakingTonEvent.code);
    console.log('');
}


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
