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


describe('Check reaching withdraw period limit', async () => {
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

    const aliceAmount = ethers.utils.parseUnits('900', 18);
    const bobAmount = ethers.utils.parseUnits('700', 18);
    const eveAmount = ethers.utils.parseUnits('200', 18);

    let snapshot;

    it('Save withdraw to Alice for 900 Dai (less than undeclared limit)', async () => {
        const alice = await ethers.getNamedSigner('alice');

        const withdrawalEventData = await encodeWithdrawalData({
            amount: await vault.convertToTargetDecimals(aliceAmount),
            recipient: alice.address
        });

        const payload = encodeEverscaleEvent({
            eventData: withdrawalEventData,
            proxy: vault.address,
        });

        const signatures = await utils.getPayloadSignatures(payload);

        await expect(() => vault['saveWithdrawal(bytes,bytes[])'](payload, signatures))
            .to.changeTokenBalances(
                dai,
                [vault, alice],
                [ethers.BigNumber.from(0).sub(aliceAmount), aliceAmount]
            );
    });

    it('Check withdraw period after Alice withdraw', async () => {
        const withdrawalPeriodId = utils.deriveWithdrawalPeriodId(defaultEventTimestamp);
        const withdrawalPeriod = await vault.withdrawalPeriods(withdrawalPeriodId);

        expect(withdrawalPeriod.considered)
            .to.be.equal(0, 'Wrong period considered');
        expect(withdrawalPeriod.total)
            .to.be.equal(aliceAmount, 'Wrong period total');
    });

    it('Check total pending withdrawals', async () => {
        expect(await vault.pendingWithdrawalsTotal())
            .to.be.equal(0, 'Wrong total pending withdrawals');
    });

    it('Save withdrawal to Bob for 700 Dai (less than undeclared limit, reaches the period limit)', async () => {
        const bob = await ethers.getNamedSigner('bob');

        const withdrawalEventData = await encodeWithdrawalData({
            amount: await vault.convertToTargetDecimals(bobAmount),
            recipient: bob.address
        });

        const payload = encodeEverscaleEvent({
            eventData: withdrawalEventData,
            proxy: vault.address,
        });

        const signatures = await utils.getPayloadSignatures(payload);

        await expect(vault['saveWithdrawal(bytes,bytes[])'](payload, signatures))
            .to.emit(vault, 'PendingWithdrawalUpdateApproveStatus')
            .withArgs(bob.address, 0, 1);

        snapshot = await ethers.provider.send("evm_snapshot");
    });

    it('Check Bob pending withdrawal', async () => {
        const { bob } = await getNamedAccounts();

        const pendingWithdrawal = await vault.pendingWithdrawals(bob, 0);

        expect(await vault.pendingWithdrawalsTotal())
            .to.be.equal(bobAmount, 'Wrong total pending withdrawals');

        expect(pendingWithdrawal.amount)
            .to.be.equal(bobAmount, 'Wrong amount');
        expect(pendingWithdrawal.approveStatus)
            .to.be.equal(1, 'Wrong approve status');
        expect(pendingWithdrawal.timestamp)
            .to.be.equal(defaultEventTimestamp, 'Wrong timestamp');
    });

    it('Check withdraw period after Bob withdrawal', async () => {
        const withdrawalPeriodId = utils.deriveWithdrawalPeriodId(defaultEventTimestamp);
        const withdrawalPeriod = await vault.withdrawalPeriods(withdrawalPeriodId);

        expect(withdrawalPeriod.considered)
            .to.be.equal(0, 'Wrong period considered');
        expect(withdrawalPeriod.total)
            .to.be.equal(aliceAmount.add(bobAmount), 'Wrong period total');

    });

    describe('Approve Bob withdrawal', async () => {
        it('Approve Bob withdrawal', async () => {
            const withdrawGuardian = await ethers.getNamedSigner('withdrawGuardian');
            const bob = await ethers.getNamedSigner('bob');

            await expect(() => vault
                .connect(withdrawGuardian)
                ['setPendingWithdrawalApprove((address,uint256),uint8)']([bob.address, 0], 2)
            ).to.changeTokenBalances(
                dai,
                [vault, bob],
                [ethers.BigNumber.from(0).sub(bobAmount), bobAmount]
            );
        });

        it('Check pending withdrawals total', async () => {
            expect(await vault.pendingWithdrawalsTotal())
                .to.be.equal(0, 'Wrong pending withdrawals total');
        });

        it('Check withdrawal period after Bob withdrawal approved', async () => {
            const withdrawalPeriodId = utils.deriveWithdrawalPeriodId(defaultEventTimestamp);
            const withdrawalPeriod = await vault.withdrawalPeriods(withdrawalPeriodId);

            expect(withdrawalPeriod.considered)
                .to.be.equal(bobAmount, 'Wrong period considered');
            expect(withdrawalPeriod.total)
                .to.be.equal(aliceAmount.add(bobAmount), 'Wrong period total');
        });

        it('Save Eve withdraw and check it filled instantly', async () => {
            const eve = await ethers.getNamedSigner('eve');

            const withdrawalEventData = await encodeWithdrawalData({
                amount: await vault.convertToTargetDecimals(eveAmount),
                recipient: eve.address
            });

            const payload = encodeEverscaleEvent({
                eventData: withdrawalEventData,
                proxy: vault.address,
            });

            const signatures = await utils.getPayloadSignatures(payload);

            await expect(() => vault['saveWithdrawal(bytes,bytes[])'](payload, signatures))
                .to.changeTokenBalances(
                    dai,
                    [vault, eve],
                    [ethers.BigNumber.from(0).sub(eveAmount), eveAmount]
                );
        });
    });

    describe('Reject Bob withdrawal', async () => {
        it('Revert to the snapshot', async () => {
            await ethers.provider.send("evm_revert", [snapshot]);
        });

        it('Reject Bob withdrawal', async () => {
            const withdrawGuardian = await ethers.getNamedSigner('withdrawGuardian');
            const bob = await ethers.getNamedSigner('bob');

            await expect(() => vault
                .connect(withdrawGuardian)
                ['setPendingWithdrawalApprove((address,uint256),uint8)']([bob.address, 0], 3)
            ).to.changeTokenBalances(
                dai,
                [vault, bob],
                [0, 0]
            );
        });

        it('Try to withdraw Bob', async () => {
            const bob = await ethers.getNamedSigner('bob');

            await expect(
                vault.connect(bob)
                ['withdraw(uint256,uint256,address,uint256,uint256)'](0, 0, bob.address, 0, 0)
            ).to.be.reverted;
        });

        it('Save Eve withdraw and check it filled instantly ', async () => {
            const eve = await ethers.getNamedSigner('eve');

            const withdrawalEventData = await encodeWithdrawalData({
                amount: await vault.convertToTargetDecimals(eveAmount),
                recipient: eve.address
            });

            const payload = encodeEverscaleEvent({
                eventData: withdrawalEventData,
                proxy: vault.address,
            });

            const signatures = await utils.getPayloadSignatures(payload);

            await expect(() => vault['saveWithdrawal(bytes,bytes[])'](payload, signatures))
                .to.changeTokenBalances(
                    dai,
                    [vault, eve],
                    [ethers.BigNumber.from(0).sub(eveAmount), eveAmount]
                );
        });
    });
});
