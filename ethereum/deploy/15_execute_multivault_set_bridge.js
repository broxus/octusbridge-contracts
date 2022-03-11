module.exports = async ({getNamedAccounts, deployments}) => {
    const { owner } = await getNamedAccounts();

    const bridge = await deployments.get('Bridge');

    await deployments.execute('MultiVault',
        {
            from: owner,
            log: true,
        },
        'setBridge',
        bridge.address
    );
};

module.exports.tags = ['Execute_MultiVault_setBridge'];
