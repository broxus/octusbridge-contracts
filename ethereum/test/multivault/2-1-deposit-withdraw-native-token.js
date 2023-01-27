const {
    expect,
    encodeWithdrawalData,
    encodeEverscaleEvent,
    encodeEvmTokenSourceMeta,
    ...utils
} = require('../utils');
const {ethers} = require("hardhat");


describe('Test deposit-withdraw for native token', async () => {
    let multivault, weth;

    it('Setup contracts', async () => {
        await deployments.fixture();

        multivault = await ethers.getContract('MultiVault');
        weth = await ethers.getNamedSigner("weth")
            .then(({address}) => ethers.getContractAt("IWETH", address))
    });

    describe('Deposit', async () => {
        const amount = ethers.utils.parseUnits('0.9', 'ether')

        it('should deposit eth as weth', async () => {

            const alice = await ethers.getNamedSigner('alice');

            const recipient = {
                wid: 0,
                addr: 123123
            };

            const defaultDepositFee = await multivault.defaultAlienDepositFee();
            const fee = defaultDepositFee.mul(amount).div(10000);
            const deposit = multivault
                .connect(alice)
                ['depositByNativeToken(((int8,uint256),uint256,uint256,bytes))'];


            const deposit_value = ethers.utils.parseEther("0.1");


            const deposit_expected_evers = 33;
            const deposit_payload = "0x001122";

            const depResult = await deposit({
                recipient,
                amount: amount,
                expected_evers: deposit_expected_evers,
                payload: deposit_payload
            }, {value: amount.add(deposit_value)})
            await expect(depResult)
                .to.emit(multivault, 'AlienTransfer')
                .withArgs(
                    utils.defaultChainId,
                    weth.address,
                    await weth.name(),
                    await weth.symbol(),
                    await weth.decimals(),
                    amount.sub(fee),
                    recipient.wid,
                    recipient.addr,
                    deposit_value,
                    deposit_expected_evers,
                    deposit_payload
                );
        });

        it('Check token details', async () => {
            const tokenDetails = await multivault.tokens(weth.address);

            expect(tokenDetails.isNative)
                .to.be.equal(false, 'Wrong token native flag');
            expect(tokenDetails.depositFee)
                .to.be.equal(await multivault.defaultAlienDepositFee(), 'Wrong token deposit fee');
            expect(tokenDetails.withdrawFee)
                .to.be.equal(await multivault.defaultAlienWithdrawFee(), 'Wrong token withdraw fee');
        });

        it('Check MultiVault balance', async () => {
            expect(await weth.balanceOf(multivault.address))
                .to.be.equal(amount, 'Wrong MultiVault token balance after deposit');
        });

        it('Skim alien fees in EVM', async () => {
            const owner = await ethers.getNamedSigner('owner');

            const fee = await multivault.fees(weth.address);

            await expect(() => multivault.connect(owner)['skim(address)'](weth.address))
                .to.changeTokenBalances(
                    weth,
                    [multivault, owner],
                    [ethers.BigNumber.from(0).sub(fee), fee]
                );

            expect(await multivault.fees(weth.address))
                .to.be.equal(0);
        });
    });

    describe.skip('Withdraw', async () => {
        const amount = ethers.utils.parseUnits('500', 18);

        let payload, signatures;

        it('Prepare payload & signatures', async () => {
            const {bob} = await getNamedAccounts();

            const withdrawalEventData = utils.encodeMultiTokenAlienWithdrawalData({
                token: token.address,
                amount: amount,
                recipient: bob,
                chainId: utils.defaultChainId,
                callback: {}
            });

            payload = encodeEverscaleEvent({
                eventData: withdrawalEventData,
                proxy: multivault.address,
            });

            signatures = await utils.getPayloadSignatures(payload);
        });

        it('Save withdrawal', async () => {
            const bob = await ethers.getNamedSigner('bob');

            const {
                withdrawFee
            } = await multivault.tokens(token.address);

            const fee = withdrawFee.mul(amount).div(10000);

            await expect(() => multivault['saveWithdrawAlien(bytes,bytes[])'](payload, signatures))
                .to.changeTokenBalances(
                    token,
                    [multivault, bob],
                    [ethers.BigNumber.from(0).sub(amount.sub(fee)), amount.sub(fee)]
                );
        });
    });
});
