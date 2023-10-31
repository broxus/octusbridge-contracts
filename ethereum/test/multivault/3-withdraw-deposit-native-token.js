const {
    expect,
    encodeEverscaleEvent,
    ...utils
} = require('./../utils');
const {getNamedAccounts, ethers} = require("hardhat");


describe('Test deposit-withdraw for native token', async () => {
    let multivault, token;

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
    });

    describe('Withdraw WEVER Token', async () => {
        let payload, signatures;

        const amount = ethers.utils.parseUnits('500', 18);

        it('Save withdraw', async () => {
            const bob = await ethers.getNamedSigner('bob');

            const withdrawalEventData = utils.encodeMultiTokenNativeWithdrawalData({
                native,

                name: meta.name,
                symbol: meta.symbol,
                decimals: meta.decimals,

                amount,
                recipient: bob.address,
                chainId: utils.defaultChainId,

                callback: {}
            });

            payload = encodeEverscaleEvent({
                eventData: withdrawalEventData,
                proxy: multivault.address,
            });

            signatures = await utils.getPayloadSignatures(payload);

            await multivault
                .connect(bob)
                .saveWithdrawNative(payload, signatures);
        });

        it('Check EVM token meta', async () => {
            const tokenAddress = await multivault.getNativeToken(native);

            token = await ethers.getContractAt('MultiVaultToken', tokenAddress);

            expect(await token.name())
                .to.be.equal(`${meta.name}`, 'Wrong token name');
            expect(await token.symbol())
                .to.be.equal(`${meta.symbol}`, 'Wrong token symbol');
            expect(await token.decimals())
                .to.be.equal(meta.decimals, 'Wrong token decimals');
        });

        it('Check native token status', async () => {
            const tokenAddress = await multivault.getNativeToken(native);

            const tokenDetails = await multivault.tokens(tokenAddress);

            expect(tokenDetails.isNative)
                .to.be.equal(true, 'Wrong token native flag');
            expect(tokenDetails.depositFee)
                .to.be.equal(await multivault.defaultNativeDepositFee(), 'Wrong token deposit fee');
            expect(tokenDetails.withdrawFee)
                .to.be.equal(await multivault.defaultNativeWithdrawFee(), 'Wrong token withdraw fee');
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

        it('Bob transfers 100 ERC20 WEVER to Alice', async () => {
            const bob = await ethers.getNamedSigner('bob');
            const { alice } = await getNamedAccounts();

            await token.connect(bob).transfer(alice, ethers.utils.parseUnits('100', 18));
        });

        it('Skim native fees', async () => {
            const owner = await ethers.getNamedSigner('owner');

            const fee = await multivault.fees(token.address);

            await expect(() => multivault.connect(owner).skim(token.address))
                .to.changeTokenBalances(
                    token,
                    [multivault, owner],
                    [0, fee]
                );

            expect(await multivault.fees(token.address))
                .to.be.equal(0);
        });
    });

    describe('Deposit WEVER token', async () => {
        const amount = ethers.utils.parseUnits('300', 18);

        let fee;

        it('Bob deposits 300 WEVER', async () => {
            const bob = await ethers.getNamedSigner('bob');

            const recipient = {
                wid: 0,
                addr: 123123
            };

            const tokenDetails = await multivault.tokens(token.address);

            fee = tokenDetails.depositFee.mul(amount).div(10000);

            const deposit = multivault
                .connect(bob)
                ['deposit(((int8,uint256),address,uint256,uint256,bytes))'];

            const deposit_value = ethers.utils.parseEther("0.1");
            const deposit_expected_evers = 33;
            const deposit_payload = "0x001122";

            await expect(deposit({
                recipient,
                token: token.address,
                amount,
                expected_evers: deposit_expected_evers,
                payload: deposit_payload
            }, { value: deposit_value }))
                .to.emit(multivault, 'NativeTransfer')
                .withArgs(
                    native.wid,
                    native.addr,
                    amount.sub(fee),
                    recipient.wid,
                    recipient.addr,
                    deposit_value,
                    deposit_expected_evers,
                    deposit_payload
                );
        });

        it('Check MultiVault balance', async () => {
            expect(await token.balanceOf(multivault.address))
                .to.be.equal(0, 'MultiVault balance should be zero');
        });
    });

    describe('Withdraw different token with custom prefix', async () => {
        const native = {
            wid: -1,
            addr: 555
        };

        const meta = {
            name: 'Whiskey',
            symbol: 'JIM',
            decimals: 9
        };

        const amount = ethers.utils.parseUnits('10', 9);

        it('Set token prefix', async () => {
            const owner = await ethers.getNamedSigner('owner');

            const tokenAddress = await multivault.getNativeToken(native);

            await multivault.connect(owner).setPrefix(
                tokenAddress,
                '',
                ''
            );
        });

        it('Save withdraw', async () => {
            const bob = await ethers.getNamedSigner('bob');

            const withdrawalEventData = utils.encodeMultiTokenNativeWithdrawalData({
                native,

                name: meta.name,
                symbol: meta.symbol,
                decimals: meta.decimals,
                amount,
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
        });

        it('Check token prefix', async () => {
            const tokenAddress = await multivault.getNativeToken(native);

            token = await ethers.getContractAt('MultiVaultToken', tokenAddress);

            expect(await token.name())
                .to.be.equal(meta.name, 'Wrong token name');
            expect(await token.symbol())
                .to.be.equal(meta.symbol, 'Wrong token symbol');
            expect(await token.decimals())
                .to.be.equal(meta.decimals, 'Wrong token decimals');
        });
    });
});
