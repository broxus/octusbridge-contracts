const { legos } = require('@studydefi/money-legos');
const {
    expect,
    encodeWithdrawalData, encodeEverscaleEvent,
    ...utils
} = require('../utils');


describe('Test MultiVault deposit-withdrawal', async () => {
    let bridge, multivault, token;

    it('Setup contracts', async () => {
        await deployments.fixture();

        bridge = await ethers.getContract('Bridge');
        multivault = await ethers.getContract('MultiVault');
        token = await ethers.getContract('Token');
    });

    it('Set token deposit and withdraw fee greater than default', async () => {
        const owner = await ethers.getNamedSigner('owner');

        await multivault
            .connect(owner)
            .setTokenDepositFee(token.address, 1000);

        await multivault
            .connect(owner)
            .setTokenWithdrawFee(token.address, 1000);
    });

    describe('Deposit', async () => {
        const amount = ethers.utils.parseUnits('1000', 18);

        it('Alice deposits 1000 test token', async () => {
            const alice = await ethers.getNamedSigner('alice');

            const recipient = {
                wid: 0,
                addr: 123123
            };

            const fee = await multivault.calculateMovementFee(
                amount,
                token.address,
                0
            );

            await token
                .connect(alice)
                .approve(multivault.address, ethers.utils.parseUnits('1000000000000', 18));

            await expect(multivault.connect(alice).deposit(recipient, token.address, amount))
                .to.emit(multivault, 'Deposit')
                .withArgs(
                    ethers.BigNumber.from(token.address),
                    'TESTUSDT',
                    'Test USDT',
                    18,
                    amount.sub(fee),
                    recipient.wid,
                    recipient.addr
                );
        });

        it('Check MultiVault balance', async () => {
            expect(await token.balanceOf(multivault.address))
                .to.be.equal(amount, 'Wrong MultiVault token balance');
        });
    });

    describe('Withdraw', async () => {
        const amount = ethers.utils.parseUnits('500', 18);

        let payload, signatures;

        it('Prepare payload & signatures', async () => {
            const { bob } = await getNamedAccounts();

            const withdrawalEventData = utils.encodeMultiTokenWithdrawalData({
                token: ethers.BigNumber.from(token.address),
                amount: amount,
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

            const fee = await multivault.calculateMovementFee(
                amount,
                token.address,
                1
            );

            await expect(() => multivault.saveWithdraw(payload, signatures))
                .to.changeTokenBalances(
                    token,
                    [multivault, bob],
                    [ethers.BigNumber.from(0).sub(amount.sub(fee)), amount.sub(fee)]
                );
        });
    });
});
