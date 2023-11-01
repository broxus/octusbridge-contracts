const utils = require("./../test/utils");


module.exports = async ({getNamedAccounts, deployments}) => {
    const {
        owner,
        gasDonor,
    } = await getNamedAccounts();

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
            log: true
        },
        'setGasDonor',
        gasDonor
    );
}


module.exports.tags = ['Configure_MultiVault'];
