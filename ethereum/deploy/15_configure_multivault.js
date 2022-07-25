const utils = require("./../test/utils");


module.exports = async ({getNamedAccounts, deployments}) => {
    const { owner } = await getNamedAccounts();

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true
        },
        'setRewards',
        utils.defaultTonRecipient
    );

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true,
        },
        'setConfigurations',
        utils.defaultConfiguration,
        utils.defaultConfiguration
    );


    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true
        },
        'setDefaultFees',
        100,
        200,
        300,
        400
    );
}


module.exports.tags = ['Configure_MultiVault'];
