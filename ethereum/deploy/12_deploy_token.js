module.exports = async ({getNamedAccounts, deployments}) => {
    const { deployer, owner } = await getNamedAccounts();

    await deployments.deploy('Token', {
        from: deployer,
        log: true,
        args: [
            ethers.utils.parseUnits('1000000', 18),
            owner,
        ]
    });

    // - Airdrop token
    const actors = ['alice', 'bob', 'eve'];

    for (const actor of actors) {
        const actorSigner = await ethers.getNamedSigner(actor);

        await deployments.execute('Token',
            {
                from: owner,
                log: true,
            },
            'transfer',
            actorSigner.address,
            ethers.utils.parseUnits('100000')
        );
    }
};

module.exports.tags = ['Deploy_Token'];
