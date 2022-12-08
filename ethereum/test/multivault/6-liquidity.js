const {
    encodeEverscaleEvent,
    expect,
    ...utils
} = require("../utils");
const {ethers} = require("hardhat");


const recipient = {
    wid: 0,
    addr: 123123
};
const LP_BPS = ethers.BigNumber.from(10_000_000_000);


describe('Test multivault liquidity supply', async () => {
    let multivault, token, lp_token;

    const deposit_amount = ethers.utils.parseUnits('20000', 18);
    const liquidity_deposit = ethers.utils.parseUnits('100000', 18);
    const interest = 100; // 1%

    it('Setup contracts', async () => {
        await deployments.fixture();

        multivault = await ethers.getContract('MultiVault');
        token = await ethers.getContract('Token');
    });

    it('Set default liquidity interest', async () => {
        const owner = await ethers.getNamedSigner('owner');

        await multivault.connect(owner).setDefaultInterest(interest);
    });

    it('Alice deposits alien token', async () => {
        const alice = await ethers.getNamedSigner('alice');

        await token
            .connect(alice)
            .approve(multivault.address, deposit_amount);

        const deposit = multivault
            .connect(alice)
            ['deposit(((int8,uint256),address,uint256,uint256,bytes))'];

        const deposit_value = ethers.utils.parseEther("0.1");
        const deposit_expected_evers = 33;
        const deposit_payload = "0x001122";

        await deposit({
            recipient,
            token: token.address,
            amount: deposit_amount,
            expected_evers: deposit_expected_evers,
            payload: deposit_payload
        }, { value: deposit_value });
    });

    describe('Bob supplies liquidity', async () => {
        it('Mint LPs', async () => {
            const bob = await ethers.getNamedSigner('bob');

            await token
                .connect(bob)
                .approve(multivault.address, liquidity_deposit);

            await expect(() => multivault
                .connect(bob)
                .mint(token.address, liquidity_deposit, bob.address)
            ).to.changeTokenBalances(
                token,
                [bob, multivault],
                [ethers.BigNumber.from(0).sub(liquidity_deposit), liquidity_deposit]
            );
        });

        it('Check LP token intialized', async () => {
            const liquidity = await multivault.liquidity(token.address);

            expect(liquidity.interest)
                .to.be.equal(interest, 'Wrong token liquidity interest');
            expect(liquidity.activation.toNumber())
                .to.be.greaterThan(0, 'Wrong token activation');
            expect(liquidity.supply)
                .to.be.equal(liquidity.cash)
                .to.be.equal(liquidity_deposit);
        });

        it('Check exchange rate', async () => {
            const exchange_rate = await multivault.exchangeRateCurrent(token.address);

            expect(exchange_rate)
                .to.be.equal(LP_BPS, 'Wrong initial exchange rate');
        });

        it('Check LP token initialized', async () => {
            const lp_token_address = await multivault.getLPToken(token.address);
            const bob = await ethers.getNamedSigner('bob');

            lp_token = await ethers.getContractAt('MultiVaultToken', lp_token_address);

            expect(await lp_token.name())
                .to.be.equal(`Octus LP ${await token.name()}`);
            expect(await lp_token.symbol())
                .to.be.equal(`octLP${await token.symbol()}`);

            expect(await lp_token.totalSupply())
                .to.be.equal(liquidity_deposit);
            expect(await lp_token.balanceOf(bob.address))
                .to.be.equal(liquidity_deposit);
        });
    });

    describe('Alice withdraws alien token', async () => {
        const amount = ethers.utils.parseUnits('10000', 18);

        let payload, signatures;

        it('Build payload and signatures', async () => {
            const { alice } = await getNamedAccounts();

            const withdrawalEventData = utils.encodeMultiTokenAlienWithdrawalData({
                token: token.address,
                amount: amount,
                recipient: alice,
                chainId: utils.defaultChainId,
                callback: {}
            });

            payload = encodeEverscaleEvent({
                eventData: withdrawalEventData,
                proxy: multivault.address,
            });

            signatures = await utils.getPayloadSignatures(payload);
        });

        it('Alice withdraws tokens', async () => {
            const alice = await ethers.getNamedSigner('alice');

            const {
                withdrawFee
            } = await multivault.tokens(token.address);

            const fee = withdrawFee.mul(amount).div(10000);

            // expect(fee)
            //     .to.be.greaterThan(ethers.BigNumber.from(0), 'Expected non zero withdraw fee');

            await expect(() => multivault['saveWithdrawAlien(bytes,bytes[])'](payload, signatures))
                .to.changeTokenBalances(
                    token,
                    [multivault, alice],
                    [ethers.BigNumber.from(0).sub(amount.sub(fee)), amount.sub(fee)]
                );
        });

        it('Check token cash increased', async () => {
            const liquidity = await multivault.liquidity(token.address);

            expect(liquidity.cash)
                .to.be.gt(liquidity_deposit, 'Wrong liquidity cash');
            expect(liquidity.supply)
                .to.be.equal(liquidity_deposit, 'Wrong liquidity cash');
        });

        it('Check exchange rate increased', async () => {
            const exchange_rate = await multivault.exchangeRateCurrent(token.address);

            expect(exchange_rate)
                .to.be.gt(LP_BPS, 'Wrong initial exchange rate');
        });
    });

    describe('Bob removes LPs', async () => {
        it('Redeem LPs', async () => {
            const bob = await ethers.getNamedSigner('bob');
            const lp_balance = await lp_token.balanceOf(bob.address);

            const expected_tokens = await multivault.convertLPToUnderlying(token.address, lp_balance);

            expect(expected_tokens)
                .to.be.gt(liquidity_deposit, 'Wrong expected amount before LP redeem');

            await expect(() => multivault.connect(bob).redeem(token.address, lp_balance, bob.address))
                .to.changeTokenBalances(
                    token,
                    [multivault, bob],
                    [ethers.BigNumber.from(0).sub(expected_tokens), expected_tokens]
                );
        });
    });
});
