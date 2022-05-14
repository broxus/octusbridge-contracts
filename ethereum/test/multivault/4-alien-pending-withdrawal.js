const {
    encodeEverscaleEvent,
    expect,
    ...utils
} = require("../utils");
const {ethers} = require("hardhat");
const {util} = require("chai");

describe('Alice creates pending withdrawal', async () => {
    let multivault, token;
    let snapshot;

    const amount = ethers.utils.parseUnits('1000', 18);

    it('Setup contracts', async () => {
        await deployments.fixture();

        multivault = await ethers.getContract('MultiVault');
        token = await ethers.getContract('Token');
    });

    it('Alice deposits alien token', async () => {
        const alice = await ethers.getNamedSigner('alice');

        const recipient = {
            wid: 0,
            addr: 123123
        };

        await token
            .connect(alice)
            .approve(multivault.address, 1);

        await multivault
            .connect(alice)
            ['deposit((int8,uint256),address,uint256)'](recipient, token.address, 1);
    });

    it('Save withdrawal to Bob', async () => {
        const { bob } = await getNamedAccounts();

        const withdrawalEventData = utils.encodeMultiTokenAlienWithdrawalData({
            token: token.address,
            amount: amount,
            recipient: bob,
            chainId: utils.defaultChainId
        });

        const payload = encodeEverscaleEvent({
            eventData: withdrawalEventData,
            proxy: multivault.address,
        });

        const signatures = await utils.getPayloadSignatures(payload);

        await multivault['saveWithdrawAlien(bytes,bytes[])'](payload, signatures);
    });

    it('Check pending withdrawal', async () => {
        const { bob } = await getNamedAccounts();

        const pendingWithdrawal = await multivault.pendingWithdrawals(bob, 0);

        const defaultWithdrawFee = await multivault.defaultAlienWithdrawFee();

        const fee = defaultWithdrawFee.mul(amount).div(10000);

        expect(pendingWithdrawal.token)
            .to.be.equal(token.address, 'Wrong token in pending withdrawal');
        expect(pendingWithdrawal.amount)
            .to.be.equal(amount.sub(fee), 'Wrong amount in pending withdrawal');
        expect(pendingWithdrawal.bounty)
            .to.be.equal(0, 'Wrong bounty in pending withdrawal');

        expect(await multivault.pendingWithdrawalsTotal(token.address))
            .to.be.equal(amount.sub(fee), 'Wrong total pending withdrawals');

        expect(await multivault.pendingWithdrawalsPerUser(bob))
            .to.be.equal(1, 'Wrong pending withdrawals per user');

        snapshot = await ethers.provider.send("evm_snapshot");
    });

    describe('Cancel pending withdrawal', async () => {
        const amountToCancel = 100;
        const newBounty = 12;

        it('Checkout state', async () => {
            await ethers.provider.send("evm_revert", [snapshot]);
        });

        it('Cancel pending withdrawal', async () => {
            const bob = await ethers.getNamedSigner('bob');

            await expect(
                multivault
                    .connect(bob)
                    .cancelPendingWithdrawal(0, amountToCancel, utils.defaultTonRecipient, newBounty)
            )
                .to.emit(multivault, 'AlienTransfer')
                .withArgs(
                    utils.defaultChainId,
                    token.address,
                    await token.name(),
                    await token.symbol(),
                    await token.decimals(),
                    amountToCancel,
                    utils.defaultTonRecipient.wid,
                    utils.defaultTonRecipient.addr
                );
        });

        it('Check pending withdrawal', async () => {
            const { bob } = await getNamedAccounts();

            const pendingWithdrawal = await multivault.pendingWithdrawals(bob, 0);

            expect(pendingWithdrawal.bounty)
                .to.be.equal(newBounty, 'Wrong bounty after cancel');

            const defaultWithdrawFee = await multivault.defaultAlienWithdrawFee();

            const fee = defaultWithdrawFee.mul(amount).div(10000);

            expect(pendingWithdrawal.amount)
                .to.be.equal(amount.sub(fee).sub(amountToCancel), 'Wrong pending amount after cancel');
        });
    });

    describe('Fill pending with deposit', async () => {
        const newBounty = 12;

        it('Checkout state', async () => {
            await ethers.provider.send("evm_revert", [snapshot]);
        });

        it('Set bounty', async () => {
            const bob = await ethers.getNamedSigner('bob');

            await multivault.connect(bob).setPendingWithdrawalBounty(0, newBounty);

            const pendingWithdrawal = await multivault.pendingWithdrawals(bob.address, 0);

            expect(pendingWithdrawal.bounty)
                .to.be.equal(newBounty, 'Wrong bounty');
        });

        it('Fill pending withdrawal', async () => {
            const { bob } = await getNamedAccounts();
            const alice = await ethers.getNamedSigner('alice');

            const pendingWithdrawal = await multivault.pendingWithdrawals(bob, 0);

            await token
                .connect(alice)
                .approve(multivault.address, pendingWithdrawal.amount);

            const defaultDepositFee = await multivault.defaultAlienDepositFee();

            const fee = defaultDepositFee
                .mul(pendingWithdrawal.amount.add(pendingWithdrawal.bounty))
                .div(10000);

            await expect(multivault
                .connect(alice)
                ['deposit((int8,uint256),address,uint256,uint256,(address,uint256)[])'](
                    utils.defaultTonRecipient,
                    token.address,
                    pendingWithdrawal.amount,
                    pendingWithdrawal.bounty,
                    [[bob, 0]],
                )
            )
                .to.emit(multivault, 'AlienTransfer')
                .withArgs(
                    utils.defaultChainId,
                    token.address,
                    await token.name(),
                    await token.symbol(),
                    await token.decimals(),
                    pendingWithdrawal.amount.add(pendingWithdrawal.bounty).sub(fee),
                    utils.defaultTonRecipient.wid,
                    utils.defaultTonRecipient.addr
                );
        });

        it('Check pending withdrawal', async () => {
            const { bob } = await getNamedAccounts();

            const pendingWithdrawal = await multivault.pendingWithdrawals(bob, 0);

            expect(pendingWithdrawal.amount)
                .to.be.equal(0, 'Wrong pending amount after fill');
        });
    });

    describe('Force pending withdrawal', async () => {
        it('Checkout state', async () => {
            await ethers.provider.send("evm_revert", [snapshot]);
        });

        it('Send tokens to the MultiVault', async () => {
            const alice = await ethers.getNamedSigner('alice');

            const { bob } = await getNamedAccounts();

            const pendingWithdrawal = await multivault.pendingWithdrawals(bob, 0);

            await token.connect(alice).transfer(
                multivault.address,
                pendingWithdrawal.amount
            );
        });

        it('Force pending withdrawal', async () => {
            const bob = await ethers.getNamedSigner('bob');

            const pendingWithdrawal = await multivault.pendingWithdrawals(bob.address, 0);

            await expect(() => multivault.forceWithdraw([[bob.address, 0]]))
                .to.changeTokenBalances(
                    token,
                    [multivault, bob],
                    [ethers.BigNumber.from(0).sub(pendingWithdrawal.amount), pendingWithdrawal.amount]
                );
        });

        it('Check pending withdrawal', async () => {
            const { bob } = await getNamedAccounts();

            const pendingWithdrawal = await multivault.pendingWithdrawals(bob, 0);

            expect(pendingWithdrawal.amount)
                .to.be.equal(0, 'Wrong pending amount after fill');
        });
    });
});
