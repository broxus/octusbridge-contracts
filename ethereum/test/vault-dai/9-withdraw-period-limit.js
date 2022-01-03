const { legos } = require('@studydefi/money-legos');
const {
    expect,
    defaultConfiguration,
    defaultTonRecipient,
    defaultEventTimestamp,
    getVaultByToken,
    generateWallets,
    encodeTonEvent,
    encodeWithdrawalData,
    getNetworkTime,
    ...utils
} = require('../utils');


describe('Force withdraw pending', async () => {
    let vault, wrapper, dai;

    it('Setup contracts', async () => {
        await deployments.fixture();

        dai = await ethers.getContractAt(
            legos.erc20.abi,
            legos.erc20.dai.address,
        );
    });

    it('Create vault', async () => {
        const owner = await ethers.getNamedSigner('owner');
        const { guardian } = await getNamedAccounts();

        const registry = await ethers.getContract('Registry');

        await registry.connect(owner).newVault(
            dai.address,
            guardian,
            18,
            0,
            0,
        );

        vault = await getVaultByToken(registry, dai.address);

        wrapper = await ethers.getContractAt(
            'VaultWrapper',
            (await vault.wrapper())
        );
    });

    it('Set configuration', async () => {
        const owner = await ethers.getNamedSigner('owner');

        await vault
            .connect(owner)
            .setConfiguration(defaultConfiguration);
    });

    it('Set deposit limit', async () => {
        const depositLimit = ethers.utils.parseUnits('100000', 18);

        const owner = await ethers.getNamedSigner('owner');

        await vault
            .connect(owner)
            .setDepositLimit(depositLimit);
    });

    it('Set withdraw guardian, withdraw period limit and undeclared withdraw limit', async () => {
        const owner = await ethers.getNamedSigner('owner');
        const { withdrawGuardian } = await getNamedAccounts();

        const withdrawLimitPerPeriod = ethers.utils.parseUnits('10000', 18);
        const undeclaredWithdrawLimit = ethers.utils.parseUnits('20000', 18);

        await vault.connect(owner).setWithdrawGuardian(withdrawGuardian);
        await vault.connect(owner).setWithdrawLimitPerPeriod(withdrawLimitPerPeriod);
        await vault.connect(owner).setUndeclaredWithdrawLimit(undeclaredWithdrawLimit);
    });

    it('Fill Alice balance with Dai', async () => {
        const { alice, dai_owner } = await getNamedAccounts();

        await utils.issueTokens({
            token: dai,
            owner: dai_owner,
            recipient: alice,
            amount: ethers.utils.parseUnits('100000', 18)
        });
    });

    it('Alice infinite approve on vault', async () => {
        const alice = await ethers.getNamedSigner('alice');

        await dai
            .connect(alice)
            .approve(vault.address, ethers.utils.parseUnits('1000000000000', 18));
    });

    it('Deposit', async () => {
        const amount = ethers.utils.parseUnits('13000', 18);

        const alice = await ethers.getNamedSigner('alice');

        const recipient = {
            wid: 0,
            addr: 123123
        };

        await expect(
            wrapper
                .connect(alice)
                .deposit(recipient, amount)
        )
            .to.emit(vault, 'Deposit')
            .withArgs(amount, recipient.wid, recipient.addr);
    });

    describe('Check withdraw period limit', async () => {
        const aliceAmount = ethers.utils.parseUnits('6000', 18);
        const bobAmount = ethers.utils.parseUnits('5000', 18);
        const eveAmount = ethers.utils.parseUnits('1000', 18);

        let snapshot;

        it('Save Alice withdrawal', async () => {
            const alice = await ethers.getNamedSigner('alice');

            const withdrawalEventData = await encodeWithdrawalData({
                amount: aliceAmount.toString(),
                recipient: alice.address
            });

            const payload = encodeTonEvent({
                eventData: withdrawalEventData,
                proxy: vault.address,
            });

            const initialRelays = utils.sortAccounts(await ethers.getSigners());

            const signatures = await Promise.all(initialRelays
                .map(async (account) => utils.signReceipt(payload, account)));

            await expect(() => wrapper.saveWithdraw(payload, signatures, 0))
                .to.changeTokenBalances(
                    dai,
                    [vault, alice],
                    [ethers.BigNumber.from(0).sub(aliceAmount), aliceAmount]
                );

            expect(await vault.pendingWithdrawalsTotal())
                .to.be.equal(0, 'Wrong total pending withdrawals');
        });

        it('Check withdraw period after Alice withdraw', async () => {
            const withdrawalPeriodId = utils.deriveWithdrawalPeriodId(defaultEventTimestamp);
            const withdrawalPeriod = await vault.withdrawalPeriods(withdrawalPeriodId);

            expect(withdrawalPeriod.considered)
                .to.be.equal(0, 'Wrong period considered');
            expect(withdrawalPeriod.total)
                .to.be.equal(aliceAmount, 'Wrong period total');
        });

        it('Save Bob withdrawal', async () => {
            const bob = await ethers.getNamedSigner('bob');

            const withdrawalEventData = await encodeWithdrawalData({
                amount: bobAmount.toString(),
                recipient: bob.address
            });

            const payload = encodeTonEvent({
                eventData: withdrawalEventData,
                proxy: vault.address,
            });

            const initialRelays = utils.sortAccounts(await ethers.getSigners());

            const signatures = await Promise.all(initialRelays
                .map(async (account) => utils.signReceipt(payload, account)));

            await expect(wrapper.saveWithdraw(payload, signatures, 0))
                .to.emit(vault, 'UpdatePendingWithdrawApprove')
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
            expect(pendingWithdrawal.open)
                .to.be.equal(true, 'Wrong open');
            expect(pendingWithdrawal.approveStatus)
                .to.be.equal(1, 'Wrong approve status');
            expect(pendingWithdrawal._timestamp)
                .to.be.equal(defaultEventTimestamp, 'Wrong timestamp');
        });

        it('Check withdraw period after Bob withdraw', async () => {
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

                await expect(() => wrapper.connect(withdrawGuardian).setPendingWithdrawApprove([[bob.address, 0]], [2]))
                    .to.changeTokenBalances(
                        dai,
                        [vault, bob],
                        [ethers.BigNumber.from(0).sub(bobAmount), bobAmount]
                    );
            });

            it('Check pending withdrawals total', async () => {
                expect(await vault.pendingWithdrawalsTotal())
                    .to.be.equal(0, 'Wrong pending withdrawals total');
            });

            it('Check withdrawal period after Bob approved', async () => {
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
                    amount: eveAmount.toString(),
                    recipient: eve.address
                });

                const payload = encodeTonEvent({
                    eventData: withdrawalEventData,
                    proxy: vault.address,
                });

                const initialRelays = utils.sortAccounts(await ethers.getSigners());

                const signatures = await Promise.all(initialRelays
                    .map(async (account) => utils.signReceipt(payload, account)));

                await expect(() => wrapper.saveWithdraw(payload, signatures, 0))
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

                await expect(() => wrapper.connect(withdrawGuardian).setPendingWithdrawApprove([[bob.address, 0]], [3]))
                    .to.changeTokenBalances(
                        dai,
                        [vault, bob],
                        [0, 0]
                    );
            });

            it('Try to withdraw Bob', async () => {
                const bob = await ethers.getNamedSigner('bob');

                await expect(vault.connect(bob)['withdraw(uint256,uint256)'](0, 0))
                    .to.be.revertedWith('Vault: pending withdrawal not approved');
            });

            it('Save Eve withdraw and check it filled instantly ', async () => {
                const eve = await ethers.getNamedSigner('eve');

                const withdrawalEventData = await encodeWithdrawalData({
                    amount: eveAmount.toString(),
                    recipient: eve.address
                });

                const payload = encodeTonEvent({
                    eventData: withdrawalEventData,
                    proxy: vault.address,
                });

                const initialRelays = utils.sortAccounts(await ethers.getSigners());

                const signatures = await Promise.all(initialRelays
                    .map(async (account) => utils.signReceipt(payload, account)));

                await expect(() => wrapper.saveWithdraw(payload, signatures, 0))
                    .to.changeTokenBalances(
                        dai,
                        [vault, eve],
                        [ethers.BigNumber.from(0).sub(eveAmount), eveAmount]
                    );
            });
        });
    });
});
