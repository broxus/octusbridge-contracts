const utils = require("./../test/utils");


module.exports = async ({getNamedAccounts, deployments}) => {
    const {
        deployer,
        owner,
        bridge: bridge_,
        gasDonor
    } = await getNamedAccounts();

    let bridge_address;

    if (bridge_ === ethers.constants.AddressZero) {
        const bridge = await deployments.get('Bridge');

        bridge_address = bridge.address;
    } else {
        bridge_address = bridge_;
    }

    await deployments.execute('MultiVault',
        {
            from: deployer,
            log: true,
        },
        'initialize',
        bridge_address,
        owner,
    );

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true,
        },
        'setDefaultNativeDepositFee',
        100,
    );

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true,
        },
        'setDefaultNativeWithdrawFee',
        200,
    );

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true,
        },
        'setDefaultAlienDepositFee',
        300,
    );

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true,
        },
        'setDefaultAlienWithdrawFee',
        400,
    );

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true,
        },
        'setConfigurationAlien',
        utils.defaultConfiguration,
    );

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true,
        },
        'setConfigurationNative',
        utils.defaultConfiguration,
    );

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true,
        },
        'setRewards',
        utils.defaultTonRecipient,
    );

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true
        },
        'setGasDonor',
        gasDonor
    );
}


module.exports.tags = ['Configure_MultiVault'];
