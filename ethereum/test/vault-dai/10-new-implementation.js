// const {
//     getSignerFromAddr,
//     expect,
//     getVaultByToken, encodeWithdrawalData, encodeTonEvent
// } = require("../utils");
// const {legos} = require("@studydefi/money-legos");
// const logger = require('mocha-logger');
//
//
//
// describe('Check new implementation', async function() {
//     this.timeout(200000000);
//
//     const multisigAddress = '0xB8dD7223edc08A1681c81278D31d644576ECF0b4';
//     const vaultProxyAddress = '0xefea62b5d231410899e54617af0ec23f667f0109';
//     const proxyAdminAddress = '0xB399B7d8175C3a2fdf9fcEF8E24F4Fb07d4cf5a9';
//     const pendingWithdrawalAuthor = '0x8800a26f67b50f84639b6e943c3124911c594a60';
//     const bridgeAddress = '0xe0c84468B19ba3B5adda9a734E8153BEc497D151';
//
//     let vaultProxy;
//     let oldVaultAttributes = {};
//     let oldConfiguration;
//
//     it('Setup contracts', async function() {
//         await deployments.fixture();
//
//         vaultProxy = await ethers.getContractAt('Vault', vaultProxyAddress);
//     });
//
//     it('Save Vault details', async () => {
//         const attributes = [
//             'token',
//             'governance',
//             'management',
//             'guardian',
//             // 'pendingWithdrawalsTotal',
//             // 'wrapper',
//             'bridge',
//             // 'configuration',
//             // 'rewards',
//             // 'depositFee',
//             // 'withdrawFee',
//             'emergencyShutdown',
//             'depositLimit',
//             'debtRatio',
//             'totalDebt',
//             'lastReport',
//             'lockedProfit',
//             'lockedProfitDegradation',
//             'managementFee',
//             'performanceFee',
//             'tokenDecimals',
//             'targetDecimals',
//         ];
//
//         for (const attribute of attributes) {
//             oldVaultAttributes[attribute] = await vaultProxy[attribute]();
//         }
//
//         oldConfiguration = await vaultProxy.configuration();
//
//         expect(await vaultProxy.apiVersion())
//             .to.be.equal('0.1.3');
//     });
//
//     it('Check configuration', async () => {
//         console.log(await vaultProxy.configuration());
//     });
//
//     it('Update Vault implementation and wrapper', async () => {
//         // Impersonate multisig
//         const multisig = await getSignerFromAddr(multisigAddress);
//
//         // Fill multisig with gas
//         const alice = await ethers.getNamedSigner('alice');
//         await alice.sendTransaction({
//             to: multisigAddress,
//             value: ethers.utils.parseEther("1.0")
//         });
//
//         // Update implementation through proxy admin
//         const proxyAdmin = await ethers.getContractAt('ProxyAdmin', proxyAdminAddress);
//         const Vault = await ethers.getContract('Vault');
//
//         await multisig.sendTransaction({
//             to: alice.address,
//             value: ethers.utils.parseEther("0.5")
//         });
//
//         await proxyAdmin
//             .connect(multisig)
//             .transferOwnership(alice.address);
//
//         await vaultProxy
//             .connect(multisig)
//             .setWrapper(alice.address);
//
//         await proxyAdmin
//             .connect(alice)
//             .upgrade(vaultProxyAddress, Vault.address);
//     });
//
//     it('Create one more pending', async () => {
//         const alice = await ethers.getNamedSigner('alice');
//
//         await vaultProxy.connect(alice).saveWithdraw(
//             '0x48656c6c6f20576f726c64210000000000000000000000000000000000000000',
//             pendingWithdrawalAuthor,
//             ethers.utils.parseUnits('500000', 18),
//             10000000,
//             0
//         );
//
//         expect(await vaultProxy.pendingWithdrawalsPerUser(pendingWithdrawalAuthor))
//             .to.be.equal(2, "Wrong pendings per user");
//     });
//
//     describe('Check Vault details after update', async () => {
//         it('Check configuration', async () => {
//             const newConfiguration = await vaultProxy.configuration();
//
//             expect(newConfiguration.wid)
//                 .to.be.equal(oldConfiguration.wid, 'Wrong configuration wid');
//             expect(newConfiguration.addr)
//                 .to.be.equal(oldConfiguration.addr, 'Wrong configuration addr');
//         });
//
//         it('Check pending withdrawal', async () => {
//             const oldPending = await vaultProxy.pendingWithdrawals(pendingWithdrawalAuthor, 0);
//
//             expect(oldPending.open)
//                 .to.be.equal(true, 'Wrong old pending open');
//             expect(oldPending.bounty)
//                 .to.be.equal(0, 'Wrong old pending bounty');
//             expect(oldPending.approveStatus)
//                 .to.be.equal(0, 'Wrong old pending approve status');
//             expect(oldPending._timestamp)
//                 .to.be.equal(0, 'Wrong old pending timestamp');
//
//             const newPending = await vaultProxy.pendingWithdrawals(pendingWithdrawalAuthor, 1);
//
//             expect(newPending.open)
//                 .to.be.equal(true, 'Wrong new pending open');
//             expect(newPending.bounty)
//                 .to.be.equal(0, 'Wrong new pending bounty');
//             expect(newPending.approveStatus)
//                 .to.be.equal(1, 'Wrong new pending approve status');
//             expect(newPending._timestamp)
//                 .to.be.equal(10000000, 'Wrong new pending timestamp');
//         });
//
//         it('Check api version', async () => {
//             expect(await vaultProxy.apiVersion())
//                 .to.be.equal('0.1.4');
//         });
//
//         it('Check attributes', async () => {
//             for (const [attributeName, attributeValue] of Object.entries(oldVaultAttributes)) {
//                 const newValue = await vaultProxy[attributeName]();
//
//                 expect(newValue)
//                     .to.be.equal(attributeValue, `Wrong ${attributeName} value`);
//
//                 logger.log(`Attribute "${attributeName}" checked`);
//             }
//         });
//     });
// });