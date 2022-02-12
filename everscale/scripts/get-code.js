async function main() {
    const TokenTransferEthereumEvent = await locklift.factory.getContract('TokenTransferEthereumEvent');
    console.log('TokenTransferEthereumEvent');
    console.log('');
    console.log(TokenTransferEthereumEvent.code);
    console.log('');

    const TokenTransferEverscaleEvent = await locklift.factory.getContract('TokenTransferEverscaleEvent');
    console.log('TokenTransferEverscaleEvent');
    console.log('');
    console.log(TokenTransferEverscaleEvent.code);
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
