const { legos } = require('@studydefi/money-legos');
const {
    expect,
    defaultConfiguration,
    defaultTonRecipient,
    defaultEventTimestamp,
    getVaultByToken,
    generateWallets,
    encodeEverscaleEvent,
    encodeWithdrawalData,
    getNetworkTime,
    ...utils
} = require('../utils');


describe('Check reaching undeclared withdraw limit', async () => {
    let vault, dai;

    it('Setup contracts', async () => {
        await deployments.fixture();

        dai = await ethers.getContract('Dai');
        vault = await ethers.getContract('VaultDai');
    });

    it('Alice deposits 10000 Dai', async () => {
        const amount = ethers.utils.parseUnits('10000', 18);

        const alice = await ethers.getNamedSigner('alice');

        const recipient = {
            wid: 0,
            addr: 123123
        };

        await vault
            .connect(alice)
            ['deposit((int128,uint256),uint256)'](recipient, amount);
    });

    const amount = ethers.utils.parseUnits('6000', 18);

    let snapshot;

    it('Save withdraw for 6000 Dai to Bob (more than undeclared limit, less than period limit)', async () => {
        const { bob } = await getNamedAccounts();

        const withdrawalEventData = await encodeWithdrawalData({
            amount: await vault.convertToTargetDecimals(amount),
            recipient: bob
        });

        const payload = encodeEverscaleEvent({
            eventData: withdrawalEventData,
            proxy: vault.address,
        });

        const signatures = await utils.getPayloadSignatures(payload);

        await vault['saveWithdraw(bytes,bytes[])'](payload, signatures);

        snapshot = await ethers.provider.send("evm_snapshot");
    });

    it('Check pending withdrawal', async () => {
        const { bob } = await getNamedAccounts();

        expect(await vault.pendingWithdrawalsPerUser(bob))
            .to.be.equal(1, "Missed pending withdrawal");

        const pendingWithdrawal = await vault.pendingWithdrawals(bob, 0);

        expect(pendingWithdrawal.approveStatus)
            .to.be.equal(1, 'Wrong approve status');
        expect(pendingWithdrawal.timestamp)
            .to.be.equal(defaultEventTimestamp, 'Wrong timestamp');

        expect(await vault.pendingWithdrawalsTotal())
            .to.be.equal(amount, "Wrong total pending withdrawals");
    });

    it('Check withdrawal period', async () => {
        const withdrawalPeriodId = utils.deriveWithdrawalPeriodId(defaultEventTimestamp);

        const withdrawalPeriod = await vault.withdrawalPeriods(withdrawalPeriodId);

        expect(withdrawalPeriod.considered)
            .to.be.equal(0, 'Wrong period approved');
        expect(withdrawalPeriod.total)
            .to.be.equal(amount, 'Wrong period total');
    });

    it('Try to cancel withdrawal', async () => {
        const bob = await ethers.getNamedSigner('bob');

        await expect(vault.connect(bob).cancelPendingWithdrawal(0, amount, defaultTonRecipient, 0))
            .to.be.reverted;
    });

    it('Try to force withdraw', async () => {
        const { bob } = await getNamedAccounts();

        await expect(vault['forceWithdraw((address,uint256))']([bob, 0]))
            .to.be.reverted;
    });

    describe('Manually approve withdrawal', async () => {
        it('Approve withdrawal', async () => {
            const withdrawGuardian = await ethers.getNamedSigner('withdrawGuardian');
            const bob = await ethers.getNamedSigner('bob');

            await expect(() => vault
                .connect(withdrawGuardian)
                ['setPendingWithdrawalApprove((address,uint256),uint8)']([bob.address, 0], 2)
            ).to.changeTokenBalances(
                    dai,
                    [vault, bob],
                    [ethers.BigNumber.from(0).sub(amount), amount]
                );
        });

        it('Check pending withdrawal', async () => {
            const { bob } = await getNamedAccounts();

            const pendingWithdrawal = await vault.pendingWithdrawals(bob, 0);

            expect(pendingWithdrawal.approveStatus)
                .to.be.equal(2, 'Wrong approve status');
            expect(pendingWithdrawal.amount)
                .to.be.equal(0, 'Wrong amount');
        });

        it('Check withdrawal period', async () => {
            const withdrawalPeriodId = utils.deriveWithdrawalPeriodId(defaultEventTimestamp);
            const withdrawalPeriod = await vault.withdrawalPeriods(withdrawalPeriodId);

            expect(withdrawalPeriod.considered)
                .to.be.equal(amount, 'Wrong period considered');
            expect(withdrawalPeriod.total)
                .to.be.equal(amount, 'Wrong period total');
        });
    });

    describe('Reject withdrawal', async () => {
        it('Revert to the snapshot', async () => {
            await ethers.provider.send("evm_revert", [snapshot]);
        });

        it('Reject withdrawal', async () => {
            const withdrawGuardian = await ethers.getNamedSigner('withdrawGuardian');
            const { bob } = await getNamedAccounts();

            await vault
                .connect(withdrawGuardian)
                ['setPendingWithdrawalApprove((address,uint256),uint8)']([bob, 0], 3)
        });

        it('Try to cancel withdrawal', async () => {
            const bob = await ethers.getNamedSigner('bob');

            await expect(vault.connect(bob).cancelPendingWithdrawal(0, amount, defaultTonRecipient, 0))
                .to.be.reverted;
        });

        it('Check withdrawal period', async () => {
            const withdrawalPeriodId = utils.deriveWithdrawalPeriodId(defaultEventTimestamp);
            const withdrawalPeriod = await vault.withdrawalPeriods(withdrawalPeriodId);

            expect(withdrawalPeriod.considered)
                .to.be.equal(amount, 'Wrong period considered');
            expect(withdrawalPeriod.total)
                .to.be.equal(amount, 'Wrong period total');
        });
    });
});
