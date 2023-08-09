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
            let payload, signatures, pendingWithdrawId;
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
                const {
                    withdrawFee
                } = await multivault.tokens(weth.address);

                const fee = withdrawFee.mul(amount).div(10000);

                const withdrawTransaction = await multivault['saveWithdrawAlien(bytes,bytes[])'](payload, signatures)

                const {args} = await withdrawTransaction
                    .wait()
                    .then(({events}) => events.find(({event}) => event === "PendingWithdrawalCreated"));

                expect(args.amount)
                    .to.be.equal(amount.sub(fee), 'Emitted amount is wrong');
                expect(args.recipient)
                    .to.be.equal(unwrapNativeToken.address, 'Emitted recipient is wrong');
                expect(args.token)
                    .to.be.equal(weth.address, 'Emitted token is wrong');

                pendingWithdrawId = args.id;
            });

            it("Alice makes close of the bob's pending withdraw", async () => {
                const bob = await ethers.getNamedSigner('bob');
                const alice = await ethers.getNamedSigner('alice');
                const recipient = {
                    wid: 0,
                    addr: 123123
                };
                const deposit = multivault
                    .connect(alice)
                    ['depositByNativeToken(((int8,uint256),uint256,uint256,bytes),uint256,(address,uint256)[])'];

                const deposit_expected_evers = 33;
                const deposit_payload = "0x001122";
                let depResult;

                await expect(() => {
                    depResult = deposit(
                        {
                            recipient,
                            amount: amount,
                            expected_evers: deposit_expected_evers,
                            payload: deposit_payload
                        },
                        0,
                        [
                            {
                                recipient: unwrapNativeToken.address,
                                id: pendingWithdrawId
                            }
                        ],
                        {value: amount})
                    return depResult
                })
                    .to
                    .changeTokenBalances(
                        weth,
                        [multivault],
                        [0]
                    )

                await expect(await depResult)
                    .to
                    .changeEtherBalances(
                        [alice, bob],
                        [ethers.BigNumber.from(0).sub(amount), amount]
                    )

            });
        });

    })
});
