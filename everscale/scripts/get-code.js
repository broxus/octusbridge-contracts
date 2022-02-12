async function main() {
    const TokenTransferEthereumEvent = await locklift.factory.getContract('TokenTransferEthereumEvent');
    console.log('TokenTransferEthereumEvent');
    console.log(TokenTransferEthereumEvent.code);

    const TokenTransferEverscaleEvent = await locklift.factory.getContract('TokenTransferEverscaleEvent');
    console.log('TokenTransferEverscaleEvent');
    console.log(TokenTransferEverscaleEvent.code);

    // const DaoEthereumActionEvent = await locklift.factory.getContract('DaoEthereumActionEvent');
    // const StakingEthEvent = await locklift.factory.getContract('StakingEthEvent');
    // const StakingTonEvent = await locklift.factory.getContract('StakingTonEvent');
    //
    // console.log('DaoEthereumActionEvent');
    // console.log(DaoEthereumActionEvent.code);
    //
    // console.log('StakingEthEvent');
    // console.log(StakingEthEvent.code);
    //
    // console.log('StakingTonEvent');
    // console.log(StakingTonEvent.code);
}


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
