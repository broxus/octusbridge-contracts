const {
    expect,
    ...utils
} = require('./../utils');
const { legos } = require('@studydefi/money-legos');
const {encodeEvmTokenSourceMeta, encodeEverscaleEvent} = require("../utils");


describe('Test deposit-withdraw for alien token', async () => {
    let multivault, token;

    it('Setup contracts', async () => {
        await deployments.fixture();

        multivault = await ethers.getContract('MultiVault');
    });

    describe('Withdraw Dai from different EVM chain', async () => {
        let payload, signatures;

        const sourceMeta = utils.encodeEvmTokenSourceMeta(8811, legos.erc20.dai.address);
        const amount = ethers.utils.parseUnits('500', 18);

        it('Save withdraw', async () => {
            const bob = await ethers.getNamedSigner('bob');

            const withdrawalEventData = utils.encodeMultiTokenWithdrawalData({
                depositType: 0,
                source_meta: sourceMeta,
                name: 'Dai',
                symbol: legos.erc20.dai.symbol,
                decimals: legos.erc20.dai.decimals,
                amount,
                sender: utils.defaultTonRecipient,
                recipient: bob.address
            });

            payload = encodeEverscaleEvent({
                eventData: withdrawalEventData,
                proxy: multivault.address,
            });

            signatures = await utils.getPayloadSignatures(payload);

            await multivault
                .connect(bob)
                .saveWithdraw(payload, signatures);
        });

        it('Check token meta', async () => {
            const tokenAddress = await multivault.tokenFor(0, sourceMeta);

            token = await ethers.getContractAt('MultiVaultToken', tokenAddress);

            expect(await token.name())
                .to.be.equal('Dai (Octus)', 'Wrong token name');
            expect(await token.symbol())
                .to.be.equal('DAI_OCTUS', 'Wrong token symbol');
            expect(await token.decimals())
                .to.be.equal(legos.erc20.dai.decimals, 'Wrong token decimals');
        });

        it('Check recipient balance and total supply', async () => {
            const { bob } = await getNamedAccounts();

            const {
                withdrawFee
            } = await multivault.tokens(token.address);

            const fee = amount.mul(withdrawFee).div(10000);

            expect(await token.balanceOf(bob))
                .to.be.equal(amount.sub(fee), 'Wrong recipient balance after withdraw');

            expect(await token.totalSupply())
                .to.be.equal(amount.sub(fee), 'Wrong token total supply');
        });
    });

    describe('Deposit Octus token', async () => {
        const amount = ethers.utils.parseUnits('300', 18);

        let fee;

        it('Bob deposits 300 Octus Dai (deposit type = Burn)', async () => {
            const bob = await ethers.getNamedSigner('bob');

            const recipient = {
                wid: 0,
                addr: 123123
            };

            const tokenDetails = await multivault.tokens(token.address);

            fee = tokenDetails.depositFee.mul(amount).div(10000);

            await expect(multivault.connect(bob).deposit(recipient, token.address, amount, 1)) // deposit type = Burn
                .to.emit(multivault, 'Deposit')
                .withArgs(
                    1,
                    0,
                    tokenDetails.source.meta,
                    tokenDetails.meta.name,
                    tokenDetails.meta.symbol,
                    tokenDetails.meta.decimals,
                    amount.sub(fee),
                    recipient.wid,
                    recipient.addr
                );
        });

        it('Check MultiVault balance', async () => {
            expect(await token.balanceOf(multivault.address))
                .to.be.equal(0, 'MultiVault balance should be zero');
        });
    });
});