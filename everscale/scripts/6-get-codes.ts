// @ts-ignore
export const getNamedContract = async (name: string) => {
    return {
        name,
        // @ts-ignore
        ...locklift.factory.getContractArtifacts(name)
    };
}


// @ts-ignore
const main = async () => {
    // Load alien contracts
    const ethereumEverscaleEventAlien = await getNamedContract(
        "MultiVaultEVMEverscaleEventAlien"
    );
    const everscaleEthereumEventAlien = await getNamedContract(
        "MultiVaultEverscaleEVMEventAlien"
    );
    const solanaEverscaleEventAlien = await getNamedContract(
        "MultiVaultSolanaEverscaleEventAlien"
    );
    const everscaleSolanaEventAlien = await getNamedContract(
        "MultiVaultEverscaleSolanaEventAlien"
    );

    // Load native contracts
    const ethereumEverscaleEventNative = await getNamedContract(
        "MultiVaultEVMEverscaleEventNative"
    );
    const everscaleEthereumEventNative = await getNamedContract(
        "MultiVaultEverscaleEVMEventNative"
    );
    const solanaEverscaleEventNative = await getNamedContract(
        "MultiVaultSolanaEverscaleEventNative"
    );
    const everscaleSolanaEventNative = await getNamedContract(
        "MultiVaultEverscaleSolanaEventNative"
    );

    // Load alien merging
    const MergeRouter = await getNamedContract('MergeRouter');
    const MergePool = await getNamedContract('MergePool_V3');
    const MergePoolPlatform = await getNamedContract('MergePoolPlatform');

    // Load staking & dao events
    const stakingEverscaleEthereumEvent = await getNamedContract('StakingEverscaleEthereumEvent');
    const stakingEthereumEverscaleEvent = await getNamedContract('StakingEthereumEverscaleEvent');
    const daoEthereumActionEvent = await getNamedContract('DaoEthereumActionEvent');

    // Load alien token contracts
    const alienTokenRootEVM = await getNamedContract("TokenRootAlienEVM");
    const alienTokenRootSolana = await getNamedContract("TokenRootAlienSolana");

    const alienTokenWalletUpgradeableData =
        await getNamedContract("AlienTokenWalletUpgradeable");
    const alienTokenWalletPlatformData =
        await getNamedContract("AlienTokenWalletPlatform");

    for (const contract of [
        ethereumEverscaleEventAlien,
        everscaleEthereumEventAlien,
        solanaEverscaleEventAlien,
        everscaleSolanaEventAlien,

        ethereumEverscaleEventNative,
        everscaleEthereumEventNative,
        solanaEverscaleEventNative,
        everscaleSolanaEventNative,

        MergeRouter,
        MergePool,
        MergePoolPlatform,
        
        stakingEverscaleEthereumEvent,
        stakingEthereumEverscaleEvent,
        daoEthereumActionEvent,

        alienTokenRootEVM,
        alienTokenRootSolana,
        alienTokenWalletUpgradeableData,
        alienTokenWalletPlatformData
    ]) {
        console.log(contract.name);
        console.log(contract.code);
        console.log("");
    }
};


main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e);
        process.exit(1);
    });
