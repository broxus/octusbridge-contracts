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
    let vault, dai;

    it('Setup contracts', async () => {
        await deployments.fixture();

        dai = await ethers.getContractAt(
            legos.erc20.abi,
            legos.erc20.dai.address,
        );
        vault = await ethers.getContract('VaultDai');
    });

    it('Alice deposits 1000 Dai', async () => {
        const amount = ethers.utils.parseUnits('100', 18);

        const alice = await ethers.getNamedSigner('alice');

        const recipient = {
            wid: 0,
            addr: 123123
        };

        await vault
            .connect(alice)
            ['deposit((int8,uint256),uint256)'](recipient, amount);
    });

    it('Save withdrawal for 2000 Dai to Bob', async () => {
        const { bob } = await getNamedAccounts();

        const amount = ethers.utils.parseUnits('500', 18);

        const withdrawalEventData = await encodeWithdrawalData({
            amount: await vault.convertToTargetDecimals(amount),
            recipient: bob
        });

        const payload = encodeEverscaleEvent({
            eventData: withdrawalEventData,
            proxy: vault.address
        });

        const signatures = await utils.getPayloadSignatures(payload);

        await vault['saveWithdraw(bytes,bytes[])'](payload, signatures);

        expect(await vault.pendingWithdrawalsPerUser(bob))
            .to.be.equal(1, 'Wrong pending withdrawals counter');

        const withdrawal = await vault.pendingWithdrawals(bob, 0);

        expect(withdrawal.amount)
            .to.be.equal(amount, 'Wrong pending withdrawal amount');
        expect(withdrawal.bounty)
            .to.be.equal(0, 'Wrong pending withdrawal bounty');

        expect(await vault.pendingWithdrawalsTotal())
            .to.be.equal(amount, 'Wrong total pending');
    });

    it('Try to force withdraw with shortage of tokens', async () => {
        const { bob } = await getNamedAccounts();

        await expect(vault['forceWithdraw((address,uint256))']([bob, 0])).to.be.reverted;
    });

    it('Fill vault with additional tokens', async () => {
        const alice = await ethers.getNamedSigner('alice');

        const amount = ethers.utils.parseUnits('400', 18);

        await vault
            .connect(alice)
            ['deposit((int8,uint256),uint256)'](defaultTonRecipient, amount);
    });

    it('Force withdraw', async () => {
        const bob = await ethers.getNamedSigner('bob');

        const withdrawal = await vault.pendingWithdrawals(bob.address, 0);

        await expect(() => vault['forceWithdraw((address,uint256))']([bob.address, 0]))
            .to.changeTokenBalances(
                dai,
                [vault, bob],
                [
                    ethers.BigNumber.from(0).sub(withdrawal.amount),
                    withdrawal.amount
                ]
            );
    });

    it('Check pending withdrawal', async () => {
        const { bob } = await getNamedAccounts();

        const withdrawal = await vault.pendingWithdrawals(bob, 0);

        expect(withdrawal.amount)
            .to.be.equal(0, 'Wrong pending withdrawal amount');

        expect(await vault.pendingWithdrawalsTotal())
            .to.be.equal(0, 'Wrong total pending');
    });
});
