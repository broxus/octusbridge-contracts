const utils = require("./../test/utils");


module.exports = async ({getNamedAccounts, deployments}) => {
    const { owner } = await getNamedAccounts();

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true,
        },
        'setConfigurationAlien',
        utils.defaultConfiguration
    );

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true,
        },
        'setConfigurationNative',
        utils.defaultConfiguration
    );

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true
        },
        'setDefaultDepositFee',
        100
    );

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true
        },
        'setDefaultWithdrawFee',
        200
    );
}


module.exports.tags = ['Configure_MultiVault'];