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

    await deployments.execute('MultiVault',
        {
            from: deployer,
            log: true
        },
        'initialize',
        bridge_address,
        owner,
        utils.defaultTonRecipient
    );
};

module.exports.tags = ['Initialize_MultiVault'];
