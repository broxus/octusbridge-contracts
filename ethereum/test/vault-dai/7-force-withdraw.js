const { legos } = require('@studydefi/money-legos');
const {
    expect,
    defaultConfiguration,
    defaultTonRecipient,
    getVaultByToken,
    generateWallets,
    encodeEverscaleEvent,
    encodeWithdrawalData,
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
        const depositLimit = ethers.utils.parseUnits('10000', 18);

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
        const amount = ethers.utils.parseUnits('1000', 18);

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
            .withArgs(ethers.utils.parseUnits('1000', 18), recipient.wid, recipient.addr);
    });

    it('Create pending withdraw', async () => {
        const { bob } = await getNamedAccounts();

        const amount = ethers.utils.parseUnits('2000', 18);

        const withdrawalEventData = await encodeWithdrawalData({
            amount: amount.toString(),
            recipient: bob
        });

        const payload = encodeEverscaleEvent({
            eventData: withdrawalEventData,
            proxy: vault.address
        });

        const initialRelays = utils.sortAccounts(await ethers.getSigners());

        const signatures = await Promise.all(initialRelays
            .map(async (account) => utils.signReceipt(payload, account)));

        await wrapper.saveWithdraw(payload, signatures, 0);

        expect(await vault.pendingWithdrawalsPerUser(bob))
            .to.be.equal(1, 'Wrong pending withdrawals counter');

        const withdrawal = await vault.pendingWithdrawals(bob, 0);

        expect(withdrawal.amount)
            .to.be.equal(amount, 'Wrong pending withdrawal amount');
        expect(withdrawal.bounty)
            .to.be.equal(0, 'Wrong pending withdrawal bounty');
        expect(withdrawal.open)
            .to.be.equal(true, 'Wrong pending withdrawal status');

        expect(await vault.pendingWithdrawalsTotal())
            .to.be.equal(amount, 'Wrong total pending');
    });

    it('Try to force withdraw with shortage of tokens', async () => {
        const { bob } = await getNamedAccounts();

        await expect(wrapper.forceWithdraw([[bob, 0]])).to.be.reverted;
    });

    it('Fill vault with additional tokens', async () => {
        const alice = await ethers.getNamedSigner('alice');

        const amount = ethers.utils.parseUnits('1001', 18);

        await wrapper
            .connect(alice)
            .deposit(defaultTonRecipient, amount);
    });

    it('Force withdraw', async () => {
        const bob = await ethers.getNamedSigner('bob');

        const withdrawal = await vault.pendingWithdrawals(bob.address, 0);

        await expect(() => wrapper.forceWithdraw([[bob.address, 0]]))
            .to.changeTokenBalances(
                dai,
                [vault, bob],
                [ethers.BigNumber.from(0).sub(withdrawal.amount), withdrawal.amount]
            );
    });

    it('Check pending withdrawal', async () => {
        const { bob } = await getNamedAccounts();

        const withdrawal = await vault.pendingWithdrawals(bob, 0);

        expect(withdrawal.open)
            .to.be.equal(false, 'Wrong pending withdrawal status');
        expect(withdrawal.amount)
            .to.be.equal(0, 'Wrong pending withdrawal amount');

        expect(await vault.pendingWithdrawalsTotal())
            .to.be.equal(0, 'Wrong total pending');
    });
});
