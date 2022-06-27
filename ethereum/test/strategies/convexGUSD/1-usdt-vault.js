const { legos } = require('@studydefi/money-legos');
const { expect, getSignerFromAddr, mineBlocks,
    increaseTime, encodeWithdrawalData, encodeEverscaleEvent,
    getPayloadSignatures
} = require('../../utils');
const { ethers, deployments} = require("hardhat");



describe('Test Convex3GUSD strategy on USDT vault', async function () {
    this.timeout(100000);

    let vault, strategy, usdt, governance, wrapped;
    let snapshot;

    describe('Initial setup of contracts', async () => {
        it('Setup contracts', async () => {
            const usdt_vault = await ethers.getNamedSigner('usdt_vault');
            vault = await ethers.getContractAt('Vault', usdt_vault.address);
            const { usdt: usdt_addr } = await getNamedAccounts();
            // console.lo
            usdt = await ethers.getContractAt(
                legos.erc20.abi,
                usdt_addr,
            );

            const vault_token = await vault.token();
            expect(usdt.address).to.be.eq(vault_token, 'Bad vault token');
        });

        it('Deploy strategy', async () => {
            await deployments.fixture(['Deploy_USDT_Convex_GUSD']);
            strategy = await ethers.getContract('ConvexGUSDStrategyUSDT');

            // setup other contracts we need
            const wrapped_addr = await strategy.gusd3crv();
            wrapped = await ethers.getContractAt(legos.erc20.abi, wrapped_addr);
        });

        it('Set bridge mockup', async () => {
            const governance_addr = await vault.governance();
            governance = await getSignerFromAddr(governance_addr);

            const BridgeMockup = await ethers.getContractFactory('BridgeMockup');
            const mockup = await BridgeMockup.deploy();

            const alice = await ethers.getNamedSigner('alice');
            await alice.sendTransaction({
                to: governance_addr,
                value: ethers.utils.parseEther("5.0")
            });

            const proxy_admin = await ethers.getNamedSigner('proxy_admin');
            const proxyAdmin = await ethers.getContractAt(
                '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin',
                proxy_admin.address
            );

            // mainnet bridge address
            await proxyAdmin.connect(governance).upgrade(
                '0xF4404070f63a7E19Be0b1dd89A5fb88E12c0173A',
                mockup.address
            );
        });

        it.skip("Set vault mockup (for debug only)", async () => {
            const governance_addr = await vault.governance();
            governance = await getSignerFromAddr(governance_addr);

            const VaultMockup = await ethers.getContractFactory('TestVault');
            const mockup = await VaultMockup.deploy();

            const proxy_admin = await ethers.getNamedSigner('proxy_admin');
            const proxyAdmin = await ethers.getContractAt(
                '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin',
                proxy_admin.address
            );

            await proxyAdmin.connect(governance).upgrade(vault.address, mockup.address);
        });

        it('Check strategy connected to vault', async () => {
            const vault_token = await vault.token();
            const strategy_token = await strategy.want();
            const strategy_vault = await strategy.vault();

            expect(strategy_token).to.be.eq(vault_token, "Bad token set in strategy");
            expect(vault.address).to.be.eq(strategy_vault, "Bad vault address in strategy");
        });

        it("Add strategy to vault", async () => {
            const governance_addr = await vault.governance();

            const [owner] = await ethers.getSigners();
            await owner.sendTransaction({
                to: governance_addr,
                value: ethers.utils.parseEther("5.0"), // Sends exactly 1.0 ether
            });

            await vault.connect(governance).addStrategy(
                strategy.address,
                5000, // 50%,
                0, // min debt per harvest
                '9999999999999999999999999999999999999999999999999999999999999', // max debt per harvvest
                1 // strategist fee
            )

            const params = await vault.strategies(strategy.address);
            expect(params.debtRatio.toString()).to.be.eq('5000', 'Strategy not added');
        });
    });

    describe('Test strategy main functionality', async () => {
        it('1st harvest', async () => {
            const vault_bal_before = await usdt.balanceOf(vault.address);
            await strategy.connect(governance).harvest();
            const vault_bal_after = await usdt.balanceOf(vault.address);

            const strategy_deposit_balance = await strategy.balanceOfPool();

            // console.log(vault_bal_before.toString(), vault_bal_after.toString())

            expect(vault_bal_after.lt(vault_bal_before)).to.be.true;
            expect(strategy_deposit_balance.gt(0)).to.be.true;
        });

        it('Snapshot', async () => {
            snapshot = await ethers.provider.send("evm_snapshot");
        });

        it('Check harvestTrigger', async () => {
            await increaseTime(24 * 60 * 60);
            await mineBlocks(100);

            let res = await strategy.harvestTrigger('50000000000000000'); // 0.05 eth call cost
            expect(res).to.be.false;
        });

        it('2nd harvest', async () => {
            // move time forward
            await increaseTime(24 * 60 * 60);
            await mineBlocks(1);

            await increaseTime(7 * 24 * 60 * 60);
            await mineBlocks(1);

            const vault_bal_before = await usdt.balanceOf(vault.address);
            const tx = await strategy.connect(governance).harvest();

            const res = await tx.wait();
            const logs = res.events.filter(el => el.address === strategy.address);

            const harvested = logs[0];
            // console.log('Harvested:\n',harvested.args.debtOutstanding.toString())
            //
            // console.log(harvested.args.profit.toString())
            // console.log(harvested.args.loss.toString())
            // console.log(harvested.args.debtPayment.toString(), '\n')

            const vault_bal_after = await usdt.balanceOf(vault.address);

            if (harvested.args.loss > 0) {
                expect(vault_bal_before.gt(vault_bal_after)).to.be.true;
            } else {
                expect(vault_bal_after.gt(vault_bal_before)).to.be.true;
            }
        });

        it('Set withdrawal queue', async() => {
            let arr = Array(20).fill('0x0000000000000000000000000000000000000000');
            arr[0] = strategy.address;
            await vault.connect(governance).setWithdrawalQueue(arr);
        })

        it('Vault withdraw from strategy', async () => {
            const vault_bal = await usdt.balanceOf(vault.address);
            const alice = await ethers.getNamedSigner('alice');
            const bob = await ethers.getNamedSigner('bob');

            // ask 1000 more usdt than vault has (6 decimals usdt)
            const withdraw_asked = vault_bal.add('1000000000');

            const configuration = await vault.configuration();

            const withdrawalEventData = await encodeWithdrawalData({
                amount: await vault.convertToTargetDecimals(withdraw_asked.toString()),
                recipient: alice.address,
                chainId: 1111
            });

            const payload = encodeEverscaleEvent({
                eventData: withdrawalEventData,
                proxy: vault.address,
                configurationAddress: configuration.addr.toString(),
                configurationWid: configuration.wid.toString()
            });

            const signatures = await getPayloadSignatures(payload);

            await vault.connect(alice)['saveWithdraw(bytes,bytes[])'](payload, signatures);
            console.log('Save withdrawed');

            const res = await vault.pendingWithdrawals(alice.address, 0);
            // expect(res.approveStatus).to.be.eq(1, 'Bad approve status');
            // expect(res.amount.toString()).to.be.eq(withdraw_asked.toString(), 'Bad withdraw amount saved');

            // approve
            const vault_bal_0 = await usdt.balanceOf(vault.address);
            // console.log('Vault before', vault_bal_0.toString());

            const before = await usdt.balanceOf(alice.address);
            await vault.connect(governance)['setPendingWithdrawalApprove((address,uint256),uint8)']([alice.address, 0], 2);

            const after = await usdt.balanceOf(alice.address);
            const res2 = await vault.pendingWithdrawals(alice.address, 0);
            // console.log('Res2', res2.amount.toString());
            // console.log('Res2', res2.approveStatus);

            const vault_bal_1 = await usdt.balanceOf(vault.address);
            // console.log('Vault after', vault_bal_1.toString());
            // console.log('Alice before', before.toString());
            // console.log('Alice after', after.toString());

            const alice_bal_before = await usdt.balanceOf(alice.address);
            // execute with possible loss
            await vault.connect(alice).withdraw(
                0, withdraw_asked.toString(), alice.address, 0, 0
            );
            const alice_bal_after = await usdt.balanceOf(alice.address);
            const vault_bal_after = await usdt.balanceOf(vault.address);

            const delta_alice = alice_bal_after.sub(alice_bal_before);

            expect(delta_alice.toString()).to.be.eq(withdraw_asked.toString(), 'Bad withdraw');
            expect(vault_bal_after.toString()).to.be.eq('0', 'Bad withdraw');
        });

        it('Emergency and revoke', async() => {
            await strategy.connect(governance).setEmergencyExit();
            const res = await strategy.emergencyExit();

            expect(res).to.be.true;

            const vault_bal_before = await usdt.balanceOf(vault.address);

            const params = await vault.strategies(strategy.address);
            expect(params.debtRatio.toString()).to.be.eq('0', 'Strategy not revoked');

            const str_balance = await strategy.estimatedTotalAssets();

            await strategy.connect(governance).harvest();
            // now check all balances on strategy and vault
            const str_balance_after = await strategy.estimatedTotalAssets();
            const str_wrapped_balance_after = await strategy.estimatedTotalWrappedAssets();

            // expect(str_balance_after.toString()).to.be.eq('0', 'Balance not withdrawn on revoke');
            expect(str_wrapped_balance_after.toString()).to.be.eq('0', 'Balance not withdrawn on revoke');

            // apply 0.015% slippage because of withdrawing from 3crv pool
            const expected_min_vault_bal = str_balance.mul(999850).div(1000000);
            const vault_bal = await usdt.balanceOf(vault.address);
            const vault_increase = vault_bal.sub(vault_bal_before);

            expect(vault_increase.gte(expected_min_vault_bal)).to.be.true;
        })
    });

    describe('Test red buttons', async () => {
        it('Load snapshot', async () => {
            await ethers.provider.send("evm_revert", [snapshot]);
        });

        it('Withdraw to wrapped tokens', async () => {
            await increaseTime(7 * 24 * 60 * 60);
            await mineBlocks(1);

            const pool_bal = await strategy.balanceOfPool();
            await strategy.connect(governance).withdrawToWrappedTokens();
            const wrapped_bal = await strategy.balanceOfWrapped();

            expect(pool_bal.toString()).to.be.eq(wrapped_bal.toString(), 'Not withdrawed');
        });

        it('Claim tokens', async () => {
            const str_wrapped_bal = await strategy.balanceOfWrapped();
            const governance_addr = await vault.governance();

            const gov_bal_before = await wrapped.balanceOf(governance_addr);
            await strategy.connect(governance).claimWrappedWantTokens();
            const gov_bal_after = await wrapped.balanceOf(governance_addr);

            const delta = gov_bal_after.sub(gov_bal_before);
            expect(delta.toString()).to.be.eq(str_wrapped_bal.toString(), 'Balance not claimed');
        });

    });
});
