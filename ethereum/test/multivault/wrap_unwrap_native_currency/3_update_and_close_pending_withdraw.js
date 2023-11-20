const {
    expect,
    encodeWithdrawalData,
    encodeEverscaleEvent,
    encodeEvmTokenSourceMeta,
    ...utils
} = require('../../utils');
const {ethers, web3} = require("hardhat");


describe('Test deposit-withdraw-with-pending for native token', async () => {
    let multivault, weth, unwrapNativeToken;

    it('Setup contracts', async () => {
        await deployments.fixture();

        multivault = await ethers.getContract('MultiVault');
        unwrapNativeToken = await ethers.getContract('UnwrapNativeToken');

        weth = await ethers.getNamedSigner("weth")
            .then(({address}) => ethers.getContractAt("IWETH", address))
    });


    describe("Pending withdraw", async () => {
        const amount = ethers.utils.parseUnits('0.9', 'ether')
        const partialCancelWithdrawAmount = ethers.utils.parseUnits('0.1', 'ether')

        it('Setup contracts', async () => {
            await deployments.fixture();

            multivault = await ethers.getContract('MultiVault');
            unwrapNativeToken = await ethers.getContract('UnwrapNativeToken');
            weth = await ethers.getNamedSigner("weth")
                .then(({address}) => ethers.getContractAt("IWETH", address))
        });
        it('Check MultiVault balance', async () => {
            expect(await weth.balanceOf(multivault.address))
                .to.be.equal(0, 'Wrong MultiVault token balance after deposit');
        });
        describe('Bob withdraw weth, when the vault weth balance is empty', () => {
            let payload, signatures, bobsPendingWithdrawId;
            it('Prepare payload & signatures', async () => {
                const {bob} = await getNamedAccounts();


                const withdrawalEventData = utils.encodeMultiTokenAlienWithdrawalData({
                    token: weth.address,
                    amount: amount,
                    recipient: unwrapNativeToken.address,
                    chainId: utils.defaultChainId,
                    callback: {
                        recipient: unwrapNativeToken.address,
                        payload: web3.eth.abi.encodeParameters(
                            ['address'], [bob]
                        ),
                        strict: true
                    }

                });
                payload = encodeEverscaleEvent({
                    eventData: withdrawalEventData,
                    proxy: multivault.address,
                });

                signatures = await utils.getPayloadSignatures(payload)
            });

            it('Bob makes pending withdraw', async () => {
                const bob = await ethers.getNamedSigner('bob');

                const {
                    withdrawFee
                } = await multivault.tokens(weth.address);

                const fee = withdrawFee.mul(amount).div(10000);

                const withdrawTransaction = await multivault['saveWithdrawAlien(bytes,bytes[])'](payload, signatures)

                const receipt = await withdrawTransaction.wait();

                const {
                    events: [{
                        args: {
                            id: pendingWithdrawalId,
                            payloadId
                        }
                    }]
                } = receipt;

                await expect(withdrawTransaction)
                    .to
                    .emit(multivault, 'PendingWithdrawalCreated')
                    .withArgs(unwrapNativeToken.address, pendingWithdrawalId, weth.address, amount.sub(fee), payloadId);

                const {args: {id}} = await withdrawTransaction.wait().then(({events}) => events.find(({event}) => event === "PendingWithdrawalCreated"))
                bobsPendingWithdrawId = id;
                const pendingWithdrawState = await multivault.pendingWithdrawals(unwrapNativeToken.address, bobsPendingWithdrawId);
                expect(pendingWithdrawState.bounty).to.be.equal(0, "initial bounty should be equal to 0")
            });

            it("Bob set bounty for pending withdraw request", async () => {
                const NEW_BOUNTY = 10
                const bob = await ethers.getNamedSigner('bob');
                await expect(
                    await unwrapNativeToken
                        .connect(bob)
                        .setPendingWithdrawalBounty(bobsPendingWithdrawId, NEW_BOUNTY)
                )
                    .to
                    .emit(multivault, 'PendingWithdrawalUpdateBounty')
                    .withArgs(unwrapNativeToken.address, bobsPendingWithdrawId, NEW_BOUNTY)

                const pendingWithdrawState = await multivault.pendingWithdrawals(unwrapNativeToken.address, bobsPendingWithdrawId);
                expect(pendingWithdrawState.bounty).to.be.equal(NEW_BOUNTY, "bounty value should be updated")
            });
            it('Bob should partially cancel withdraw request', async () => {
                const bob = await ethers.getNamedSigner('bob');
                const recipient = {
                    wid: 0,
                    addr: 123123
                };
                const deposit_expected_evers = 33;
                const deposit_payload = "0x001122";

                await expect(
                    await unwrapNativeToken
                        .connect(bob)
                        .cancelPendingWithdrawal(
                            bobsPendingWithdrawId,
                            partialCancelWithdrawAmount,
                            recipient,
                            deposit_expected_evers,
                            deposit_payload,
                            0
                        )
                )
                    .to
                    .emit(multivault, 'PendingWithdrawalCancel')
                    .withArgs(unwrapNativeToken.address, bobsPendingWithdrawId, partialCancelWithdrawAmount)
                const pendingWithdrawState = await multivault.pendingWithdrawals(unwrapNativeToken.address, bobsPendingWithdrawId);
                expect(pendingWithdrawState.amount).to.be.equal(amount.sub(partialCancelWithdrawAmount), "withdraw amount should be decreased")
            });
            it('Alice makes deposit', async () => {
                const depositAmount = amount.mul(2);

                const alice = await ethers.getNamedSigner('alice');

                const recipient = {
                    wid: 0,
                    addr: 123123
                };

                const defaultDepositFee = await multivault.defaultAlienDepositFee();
                const fee = defaultDepositFee.mul(depositAmount).div(10000);
                const deposit = multivault
                    .connect(alice)
                    ['depositByNativeToken(((int8,uint256),uint256,uint256,bytes))'];


                const deposit_value = ethers.utils.parseEther("0.1");


                const deposit_expected_evers = 33;
                const deposit_payload = "0x001122";

                const depResult = await deposit({
                    recipient,
                    amount: depositAmount,
                    expected_evers: deposit_expected_evers,
                    payload: deposit_payload
                }, {value: depositAmount.add(deposit_value)})
                await expect(depResult)
                    .to.emit(multivault, 'AlienTransfer')
                    .withArgs(
                        utils.defaultChainId,
                        weth.address,
                        await weth.name(),
                        await weth.symbol(),
                        await weth.decimals(),
                        depositAmount.sub(fee),
                        recipient.wid,
                        recipient.addr,
                        deposit_value,
                        deposit_expected_evers,
                        deposit_payload
                    );
            });
            it('Bob run force withdraw', async () => {
                const bob = await ethers.getNamedSigner('bob');

                let forceWithdrawTransaction;
                await expect(() => {
                    forceWithdrawTransaction = multivault
                        .connect(bob)
                        .forceWithdraw([{
                            recipient: unwrapNativeToken.address,
                            id: bobsPendingWithdrawId
                        }])
                    return forceWithdrawTransaction
                }).to.changeTokenBalances(
                    weth,
                    [multivault],
                    [ethers.BigNumber.from(0).sub(amount.sub(partialCancelWithdrawAmount))]
                )
                await expect(await forceWithdrawTransaction)
                    .to
                    .emit(multivault,"PendingWithdrawalForce")
                    .withArgs({
                        recipient:unwrapNativeToken.address,
                        id: bobsPendingWithdrawId
                    })
                    .to
                    .changeEtherBalance(
                        bob,
                        amount.sub(partialCancelWithdrawAmount)
                    )
            });
        });

    })
});
