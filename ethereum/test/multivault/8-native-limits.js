const {ethers} = require("hardhat");
const {expect} = require("../utils");
const {
    encodeMultiTokenNativeWithdrawalData,
    encodeEverscaleEvent,
    ...utils
} = require("./../utils");

describe('Test native withdrawal limits', async() => {
    let multivault, token;
    let snapshot;

    const undeclared = ethers.utils.parseUnits('500', 9);
    const daily = ethers.utils.parseUnits('700', 9);

    const native = {
        wid: -1,
        addr: 444
    };

    const meta = {
        name: 'Wrapped EVER',
        symbol: 'WEVER',
        decimals: 9
    };

    it('Setup contracts', async () => {
        await deployments.fixture();

        multivault = await ethers.getContract('MultiVault');
        token = await ethers.getContract('Token');
    });

    it('Save withdraw', async () => {
        const bob = await ethers.getNamedSigner('bob');

        const withdrawalEventData = encodeMultiTokenNativeWithdrawalData({
            native,

            name: meta.name,
            symbol: meta.symbol,
            decimals: meta.decimals,

            amount: 1,
            recipient: bob.address,
            chainId: utils.defaultChainId,

            callback: {}
        });

        const payload = encodeEverscaleEvent({
            eventData: withdrawalEventData,
            proxy: multivault.address,
        });

        const signatures = await utils.getPayloadSignatures(payload);

        await multivault
            .connect(bob)
            .saveWithdrawNative(payload, signatures);

        const tokenAddress = await multivault.getNativeToken(native);

        token = await ethers.getContractAt('MultiVaultToken', tokenAddress);
    });

    it('Set limits for token', async () => {
        const owner = await ethers.getNamedSigner('owner');

        await multivault.connect(owner).setDailyWithdrawalLimits(
            token.address,
            daily,
        );

        await multivault.connect(owner).setUndeclaredWithdrawalLimits(
            token.address,
            undeclared,
        );

        await multivault.connect(owner).enableWithdrawalLimits(
            token.address,
        );

        const limits = await multivault.withdrawalLimits(token.address);

        expect(limits.enabled)
            .to.be.equal(true, 'Wrong limits enabled status');
        expect(limits.undeclared)
            .to.be.equal(undeclared, 'Wrong undeclared limit');
        expect(limits.daily)
            .to.be.equal(daily, 'Wrong daily limit');
    });

    it('Save snapshot', async () => {
        snapshot = await ethers.provider.send("evm_snapshot");
    });

    describe('Withdraw more than undeclared limit', async () => {
        let amount = undeclared.add(1);

        const eventTimestamp = 111;

        it('Withdraw', async () => {
            const { bob } = await getNamedAccounts();

            const withdrawalEventData = encodeMultiTokenNativeWithdrawalData({
                native,

                name: meta.name,
                symbol: meta.symbol,
                decimals: meta.decimals,

                amount,
                recipient: bob,
                chainId: utils.defaultChainId,

                callback: {}
            });

            const payload = encodeEverscaleEvent({
                eventData: withdrawalEventData,
                proxy: multivault.address,
                eventTimestamp,
            });

            const signatures = await utils.getPayloadSignatures(payload);

            await multivault['saveWithdrawNative(bytes,bytes[])'](payload, signatures);
        });

        it('Check pending withdrawal created', async () => {
            const { bob } = await getNamedAccounts();

            const pendingWithdrawal = await multivault.pendingWithdrawals(bob, 0);

            const defaultWithdrawFee = await multivault.defaultNativeWithdrawFee();

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
        });

        it('Check withdrawal period stats', async () => {
            const withdrawalPeriodId = utils.deriveWithdrawalPeriodId(eventTimestamp);
            const withdrawalPeriod = await multivault.withdrawalPeriods(
                token.address,
                withdrawalPeriodId
            );

            expect(withdrawalPeriod.considered)
                .to.be.equal(0, 'Wrong period considered');
            expect(withdrawalPeriod.total)
                .to.be.equal(amount, 'Wrong period total');
        });

        it('Approve pending withdrawal', async () => {
            const owner = await ethers.getNamedSigner('owner');
            const bob = await ethers.getNamedSigner('bob');

            const pendingWithdrawal = await multivault.pendingWithdrawals(bob.address, 0);

            await expect(() => multivault
                .connect(owner)
                ['setPendingWithdrawalApprove((address,uint256),uint8)']([bob.address, 0], 2)
            ).to.changeTokenBalances(
                token,
                [bob],
                [pendingWithdrawal.amount]
            );
        });

        it('Check pending withdrawal closed', async () => {
            const { bob } = await getNamedAccounts();
            const pendingWithdrawal = await multivault.pendingWithdrawals(bob, 0);

            expect(pendingWithdrawal.amount)
                .to.be.equal(0, 'Wrong amount in pending withdrawal');
            expect(pendingWithdrawal.approveStatus)
                .to.be.equal(2, 'Wrong approve status in pending withdrawal');
        });
    });
});
