const utils = require('./../test/utils');


module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer, owner } = await getNamedAccounts();

    const bridge = await deployments.get('Bridge');

    await deployments.deploy('MultiVault', {
        from: deployer,
        log: true,
        proxy: {
            proxyContract: 'OpenZeppelinTransparentProxy',
            execute: {
                methodName: 'initialize',
                args: [
                    bridge.address,
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

    const token = await deployments.get('Token');

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true,
        },
        'enableToken',
        token.address,
        0,
        0
    );
};

module.exports.tags = ['Deploy_MultiVault'];
