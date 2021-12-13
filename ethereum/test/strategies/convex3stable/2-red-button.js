const { legos } = require('@studydefi/money-legos');
const { expect, getSignerFromAddr, mineBlocks, increaseTime } = require('../../utils');
const { upgrades, ethers } = require("hardhat");



describe('Test Convex3stable strategy on DAI vault', async () => {
    let vault, strategy, dai, governance, booster, wrapped, rewards;

    describe('Initial setup of contracts', async () => {
        it('Setup contracts', async () => {
            const dai_vault = await ethers.getNamedSigner('dai_vault');
            vault = await ethers.getContractAt('Vault', dai_vault.address);
            dai = await ethers.getContractAt(
                legos.erc20.abi,
                legos.erc20.dai.address,
            );

            const vault_token = await vault.token();
            expect(dai.address).to.be.eq(vault_token, 'Bad vault token');
        });

        it('Deploy strategy', async () => {
            const Strategy = await ethers.getContractFactory('Convex3StableStrategy');
            strategy = await upgrades.deployProxy(Strategy, [vault.address]);

            // setup other contracts we need
            const booster_addr = await strategy.booster();
            booster = await ethers.getContractAt('Booster', booster_addr);
            const wrapped_addr = await strategy.crv3();
            wrapped = await ethers.getContractAt(legos.curvefi.poolTokenAbi, wrapped_addr);
            const rewards_addr = await strategy.rewardContract();
            rewards = await ethers.getContractAt('Rewards', rewards_addr);
        });

        it('Check strategy connected to vault', async () => {
            const vault_token = await vault.token();
            const strategy_token = await strategy.want();
            const strategy_vault = await strategy.vault();

            expect(vault_token).to.be.eq(strategy_token, "Bad token set in strategy");
            expect(vault.address).to.be.eq(strategy_vault, "Bad vault address in strategy");
        });

        it("Add strategy to vault", async () => {
            const governance_addr = await vault.governance();
            governance = await getSignerFromAddr(governance_addr);

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

    describe('Test strategy red button', async () => {
        it('1st harvest', async () => {
            const vault_bal_before = await dai.balanceOf(vault.address);
            await strategy.connect(governance).harvest();
            const vault_bal_after = await dai.balanceOf(vault.address);

            const strategy_deposit_balance = await strategy.balanceOfPool();

            expect(vault_bal_after.lt(vault_bal_before)).to.be.true;
            expect(strategy_deposit_balance.gt(0)).to.be.true;
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
