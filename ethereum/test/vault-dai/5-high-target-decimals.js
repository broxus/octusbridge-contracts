// const { legos } = require('@studydefi/money-legos');
// const {
//     expect,
//     defaultConfiguration,
//     defaultTonRecipient,
//     getVaultByToken,
//     generateWallets,
//     encodeEverscaleEvent,
//     encodeWithdrawalData,
//     ...utils
// } = require('../utils');
//
//
// describe('Check target decimals higher than token\'s', async () => {
//     let vault, wrapper, dai;
//
//     it('Setup contracts', async () => {
//         await deployments.fixture();
//
//         dai = await ethers.getContractAt(
//             legos.erc20.abi,
//             legos.erc20.dai.address,
//         );
//     });
//
//     it('Create vault', async () => {
//         const owner = await ethers.getNamedSigner('owner');
//         const { guardian } = await getNamedAccounts();
//
//         const registry = await ethers.getContract('Registry');
//
//         await registry.connect(owner).newVault(
//             dai.address,
//             guardian,
//             20,
//             0,
//             0,
//         );
//
//         vault = await getVaultByToken(registry, dai.address);
//
//         wrapper = await ethers.getContractAt(
//             'VaultWrapper',
//             (await vault.wrapper())
//         );
//     });
//
//     it('Set configuration', async () => {
//         const owner = await ethers.getNamedSigner('owner');
//
//         await vault
//             .connect(owner)
//             .setConfiguration(defaultConfiguration);
//     });
//
//     it('Set deposit limit', async () => {
//         const depositLimit = ethers.utils.parseUnits('10000', 18);
//
//         const owner = await ethers.getNamedSigner('owner');
//
//         await vault
//             .connect(owner)
//             .setDepositLimit(depositLimit);
//     });
//
//     it('Set withdraw guardian, withdraw period limit and undeclared withdraw limit', async () => {
//         const owner = await ethers.getNamedSigner('owner');
//         const { withdrawGuardian } = await getNamedAccounts();
//
//         const withdrawLimitPerPeriod = ethers.utils.parseUnits('10000', 18);
//         const undeclaredWithdrawLimit = ethers.utils.parseUnits('5000', 18);
//
//         await vault.connect(owner).setWithdrawGuardian(withdrawGuardian);
//         await vault.connect(owner).setWithdrawLimitPerPeriod(withdrawLimitPerPeriod);
//         await vault.connect(owner).setUndeclaredWithdrawLimit(undeclaredWithdrawLimit);
//     });
//
//     it('Fill Alice balance with Dai', async () => {
//         const { alice, dai_owner } = await getNamedAccounts();
//
//         await utils.issueTokens({
//             token: dai,
//             owner: dai_owner,
//             recipient: alice,
//             amount: ethers.utils.parseUnits('100000', 18)
//         });
//     });
//
//     it('Alice infinite approve on vault', async () => {
//         const alice = await ethers.getNamedSigner('alice');
//
//         await dai
//             .connect(alice)
//             .approve(vault.address, ethers.utils.parseUnits('1000000000000', 18));
//     });
//
//     it('Deposit', async () => {
//         const amount = ethers.utils.parseUnits('1000', 18);
//
//         const alice = await ethers.getNamedSigner('alice');
//
//         const recipient = {
//             wid: 0,
//             addr: 123123
//         };
//
//         await expect(
//             wrapper
//                 .connect(alice)
//                 .deposit(recipient, amount)
//         )
//             .to.emit(vault, 'Deposit')
//             .withArgs(ethers.utils.parseUnits('1000', 20), recipient.wid, recipient.addr);
//     });
//
//     it('Withdraw', async () => {
//         const { bob } = await getNamedAccounts();
//
//         const amount = ethers.utils.parseUnits('900', 20);
//
//         const withdrawalEventData = await encodeWithdrawalData({
//             amount: amount.toString(),
//             recipient: bob
//         });
//
//         const payload = encodeEverscaleEvent({
//             eventData: withdrawalEventData,
//             proxy: vault.address
//         });
//
//         const initialRelays = utils.sortAccounts(await ethers.getSigners());
//
//         const signatures = await Promise.all(initialRelays
//             .map(async (account) => utils.signReceipt(payload, account)));
//
//         await wrapper.saveWithdraw(payload, signatures, 0);
//
//         expect(await dai.balanceOf(bob))
//             .to.be.equal(ethers.utils.parseUnits('900', 18), 'Wrong Bob balance after withdraw');
//     });
// });
