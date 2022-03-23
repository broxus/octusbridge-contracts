const utils = require('./../test/utils');


module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer, owner, bridge: bridge_ } = await getNamedAccounts();

    let bridge_address;

    if (bridge_ === ethers.constants.AddressZero) {
        const bridge = await deployments.get('Bridge');

        bridge_address = bridge.address;
    } else {
        bridge_address = bridge_;
    }

    await deployments.deploy('MultiVault', {
        from: deployer,
        log: true,
        deterministicDeployment: ['multivault-1'],
        proxy: {
            proxyContract: 'OpenZeppelinTransparentProxy',
            execute: {
                methodName: 'initialize',
                args: [
                    bridge_address,
                    owner,
                    utils.defaultTonRecipient
                ],
            }
        }
    });
};

module.exports.tags = ['Deploy_MultiVault'];
