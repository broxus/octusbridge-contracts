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

    const StakingEverscaleSolanaEvent = await locklift.factory.getContract('StakingEverscaleSolanaEvent');
    console.log('StakingEverscaleSolanaEvent');
    console.log('');
    console.log(StakingEverscaleSolanaEvent.code);
    console.log('');

    const TokenTransferEverscaleSolanaEvent = await locklift.factory.getContract('TokenTransferEverscaleSolanaEvent');
    console.log('TokenTransferEverscaleSolanaEvent');
    console.log('');
    console.log(TokenTransferEverscaleSolanaEvent.code);
    console.log('');

    const TokenTransferSolanaEverscaleEvent = await locklift.factory.getContract('TokenTransferSolanaEverscaleEvent');
    console.log('TokenTransferSolanaEverscaleEvent');
    console.log('');
    console.log(TokenTransferSolanaEverscaleEvent.code);
    console.log('');
}


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
