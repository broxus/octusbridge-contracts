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
const {encodePacked} = require("truffle/build/324.bundled");


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
        const undeclaredWithdrawLimit = ethers.utils.parseUnits('5000', 18);

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
        const amount = ethers.utils.parseUnits('20000', 18);

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

    describe('Check reaching undeclared withdraw limit', async () => {
        const amount = ethers.utils.parseUnits('6000', 18);

        let snapshot;

        it('Create pending withdraw', async () => {
            const { bob } = await getNamedAccounts();

            const withdrawalEventData = await encodeWithdrawalData({
                amount: amount.toString(),
                recipient: bob
            });

            const payload = encodeTonEvent({
                eventData: withdrawalEventData,
                proxy: vault.address,
            });

            const initialRelays = utils.sortAccounts(await ethers.getSigners());

            const signatures = await Promise.all(initialRelays
                .map(async (account) => utils.signReceipt(payload, account)));

            await wrapper.saveWithdraw(payload, signatures, 0);

            snapshot = await ethers.provider.send("evm_snapshot");
        });

        it('Check pending withdrawal', async () => {
            const { bob } = await getNamedAccounts();

            expect(await vault.pendingWithdrawalsPerUser(bob))
                .to.be.equal(1, "Missed pending withdrawal");

            const pendingWithdrawal = await vault.pendingWithdrawals(bob, 0);

            expect(pendingWithdrawal.approveStatus)
                .to.be.equal(1, 'Wrong approve status');
            expect(pendingWithdrawal._timestamp)
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

            await expect(vault.connect(bob).cancelPendingWithdrawal(0, amount, defaultTonRecipient))
                .to.be.revertedWith("Vault: pending withdrawal not approved");
        });

        it('Try to force withdraw', async () => {
            const { bob } = await getNamedAccounts();

            await expect(wrapper.forceWithdraw([
                [bob, 0]
            ]))
                .to.be.revertedWith("Vault: pending withdrawal not approved");
        });

        describe('Manually approve withdrawal', async () => {
            it('Approve withdrawal', async () => {
                const withdrawGuardian = await ethers.getNamedSigner('withdrawGuardian');
                const bob = await ethers.getNamedSigner('bob');

                await expect(() => wrapper.connect(withdrawGuardian).setPendingWithdrawApprove([[bob.address, 0]], [2]))
                    .to.changeTokenBalances(
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
                expect(pendingWithdrawal.open)
                    .to.be.equal(false, 'Wrong open');
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

                await wrapper
                    .connect(withdrawGuardian)
                    .setPendingWithdrawApprove(
                        [[bob, 0]], [3]
                    );
            });

            it('Try to cancel withdrawal', async () => {
                const bob = await ethers.getNamedSigner('bob');

                await expect(vault.connect(bob).cancelPendingWithdrawal(0, amount, defaultTonRecipient))
                    .to.be.revertedWith('Vault: pending withdrawal not approved');
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
});
