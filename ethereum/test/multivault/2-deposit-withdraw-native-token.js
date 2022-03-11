const { legos } = require('@studydefi/money-legos');
const {
    expect,
    encodeWithdrawalData,
    encodeEverscaleEvent,
    encodeEvmTokenSourceMeta,
    ...utils
} = require('../utils');


describe('Test deposit-withdraw for native token', async () => {
    let multivault, token;

    it('Setup contracts', async () => {
        await deployments.fixture();

        multivault = await ethers.getContract('MultiVault');
        token = await ethers.getContract('Token');
    });

    describe('Deposit', async () => {
        const amount = ethers.utils.parseUnits('1000', 18);

        it('Alice deposits 1000 test token', async () => {
            const alice = await ethers.getNamedSigner('alice');

            const recipient = {
                wid: 0,
                addr: 123123
            };

            const defaultDepositFee = await multivault.defaultDepositFee();

            const fee = defaultDepositFee.mul(amount).div(10000);

            await token
                .connect(alice)
                .approve(multivault.address, ethers.utils.parseUnits('1000000000000', 18));

            const tokenSourceMeta = encodeEvmTokenSourceMeta(utils.defaultChainId, token.address);

            await expect(multivault.connect(alice).deposit(recipient, token.address, amount, 0))
                .to.emit(multivault, 'Deposit')
                .withArgs(
                    0,
                    0,
                    tokenSourceMeta,
                    await token.name(),
                    await token.symbol(),
                    await token.decimals(),
                    amount.sub(fee),
                    recipient.wid,
                    recipient.addr
                );
        });

        it('Check token details', async () => {
            const tokenDetails = await multivault.tokens(token.address);

            expect(tokenDetails.meta.name)
                .to.be.equal(await token.name(), 'Wrong token name');

            expect(tokenDetails.depositFee)
                .to.be.equal(await multivault.defaultDepositFee(), 'Wrong token deposit fee');
            expect(tokenDetails.withdrawFee)
                .to.be.equal(await multivault.defaultWithdrawFee(), 'Wrong token withdraw fee');
        });

        it('Check MultiVault balance', async () => {
            expect(await token.balanceOf(multivault.address))
                .to.be.equal(amount, 'Wrong MultiVault token balance after deposit');
        });
    });

    describe('Withdraw', async () => {
        const amount = ethers.utils.parseUnits('500', 18);

        let payload, signatures;

        it('Prepare payload & signatures', async () => {
            const { bob } = await getNamedAccounts();

            const withdrawalEventData = utils.encodeMultiTokenWithdrawalData({
                depositType: 1,
                source_meta: encodeEvmTokenSourceMeta(utils.defaultChainId, token.address),
                name: await token.name(),
                symbol: await token.symbol(),
                decimals: await token.decimals(),
                amount: amount,
                sender: utils.defaultTonRecipient,
                recipient: bob
            });

            payload = encodeEverscaleEvent({
                eventData: withdrawalEventData,
                proxy: multivault.address,
            });

            signatures = await utils.getPayloadSignatures(payload);
        });

        it('Save withdrawal', async () => {
            const bob = await ethers.getNamedSigner('bob');

            const defaultWithdrawFee = await multivault.defaultWithdrawFee();

            const fee = defaultWithdrawFee.mul(amount).div(10000);

            await expect(() => multivault.saveWithdraw(payload, signatures))
                .to.changeTokenBalances(
                    token,
                    [multivault, bob],
                    [ethers.BigNumber.from(0).sub(amount.sub(fee)), amount.sub(fee)]
                );
        });
    });
});
