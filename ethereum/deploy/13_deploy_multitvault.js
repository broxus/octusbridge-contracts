const utils = require('./../test/utils');


module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer, owner, bridge } = await getNamedAccounts();

    await deployments.deploy('MultiVault', {
        from: deployer,
        log: true,
        proxy: {
            proxyContract: 'OpenZeppelinTransparentProxy',
            execute: {
                methodName: 'initialize',
                args: [
                    bridge,
                    owner,
                    utils.defaultTonRecipient
                ],
            }
        }
    });

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true,
        },
        'setConfiguration',
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
};

module.exports.tags = ['Deploy_MultiVault'];
