const { legos } = require('@studydefi/money-legos');
const {
  expect,
  defaultConfiguration,
  defaultTonRecipient,
  getVaultByToken,
  generateWallets,
  encodeEverscaleEvent,
  encodeWithdrawalData,
  ...utils
} = require('../utils');


describe('Test Vault DAI deposit', async () => {
  let vault, dai;

  it('Setup contracts', async () => {
    await deployments.fixture();
  
    dai = await ethers.getContractAt(legos.erc20.abi, legos.erc20.dai.address);
    vault = await ethers.getContract('VaultDai');
  });

  describe('Deposit', async () => {
    const amount = ethers.utils.parseUnits('1000', 18);

    it('Alice deposits 1000 dai', async () => {
      const alice = await ethers.getNamedSigner('alice');
    
      const recipient = {
        wid: 0,
        addr: 123123
      };

      await expect(vault.connect(alice)['deposit((int128,uint256),uint256)'](recipient, amount))
        .to.emit(vault, 'Deposit')
        .withArgs(
            await vault.convertToTargetDecimals(amount),
            recipient.wid,
            recipient.addr
        );
    });
    
    it('Check total assets', async () => {
      expect(await vault.totalAssets())
        .to.be.equal(amount, 'Wrong total assets');
    });

    it('Check Vault balance', async () => {
      expect(await dai.balanceOf(vault.address))
          .to.be.equal(amount, 'Wrong Vault Dai balance');
    });
  });
  
  describe('Instantly withdraw 500 dai to Bob (less than limit)', async () => {
    const amount = ethers.utils.parseUnits('500', 18);

    let payload, signatures;

    it('Check Bob has no pending withdrawals', async () => {
      const { bob } = await getNamedAccounts();

      expect(await vault.pendingWithdrawalsPerUser(bob))
        .to.be.equal(0,' Bob should not has pending withdrawals');
    });

    it('Prepare payload & signatures', async () => {
      const { bob } = await getNamedAccounts();

      const withdrawalEventData = encodeWithdrawalData({
        amount: await vault.convertToTargetDecimals(amount),
        recipient: bob
      });

      payload = encodeEverscaleEvent({
        eventData: withdrawalEventData,
        proxy: vault.address,
      });

      signatures = await utils.getPayloadSignatures(payload);
    });

    it('Save withdrawal', async () => {
      const bob = await ethers.getNamedSigner('bob');

      await expect(() => vault['saveWithdrawal(bytes,bytes[])'](payload, signatures))
        .to.changeTokenBalances(
          dai,
          [vault, bob],
          [ethers.BigNumber.from(0, 10).sub(amount), amount]
        );
    });

    it('Check Bob has no pending withdrawals', async () => {
      const { bob } = await getNamedAccounts();

      expect(await vault.pendingWithdrawalsPerUser(bob))
        .to.be.equal(0,' Bob should not has pending withdrawals');
    });

    it('Check total pending withdrawals', async () => {
      expect(await vault.pendingWithdrawalsTotal())
        .to.be.equal(0, 'Total pending withdrawals should be zero');
    });

    it('Try to reuse payload', async () => {
      await expect(vault['saveWithdrawal(bytes,bytes[])'](payload, signatures)).to.be.reverted;
    });
  });

  describe('Create pending withdrawal and fill it with bounty', async () => {
    const amount = ethers.utils.parseUnits('600', 18);
    const bounty = ethers.utils.parseUnits('10', 18);

    it('Check Eve has no pending withdrawals', async () => {
      const { eve } = await getNamedAccounts();

      expect(await vault.pendingWithdrawalsPerUser(eve))
        .to.be.equal(0,' Eve should not has pending withdrawals');
    });

    it('Withdraw 600 dai to Eve (more than Vault has, less than limits)', async () => {
      const eve = await ethers.getNamedSigner('eve');

      const withdrawalEventData = await encodeWithdrawalData({
        amount: await vault.convertToTargetDecimals(amount),
        recipient: eve.address
      });

      const payload = encodeEverscaleEvent({
        eventData: withdrawalEventData,
        proxy: vault.address
      });

      const signatures = await utils.getPayloadSignatures(payload);

      await expect(() => vault['saveWithdrawal(bytes,bytes[],uint256)'](payload, signatures, bounty))
        .to.changeTokenBalances(
          dai,
          [vault, eve],
          [0, 0]
        );
    });

    it('Check Eve pending withdrawal', async () => {
      const { eve } = await getNamedAccounts();

      expect(await vault.pendingWithdrawalsPerUser(eve))
        .to.be.equal(1,' Eve should has pending withdrawal');

      const withdrawal = await vault.pendingWithdrawals(eve, 0);

      expect(withdrawal.amount)
        .to.be.equal(amount, 'Wrong amount');

      expect(withdrawal.bounty)
        .to.be.equal(bounty, 'Wrong bounty');

      expect(withdrawal.approveStatus)
          .to.be.equal(0, 'Wrong approve status');
    });

    it('Check total pending withdrawals', async () => {
      expect(await vault.pendingWithdrawalsTotal())
        .to.be.equal(amount, 'Total pending withdrawals wrong');
    });

    describe('Fill pending withdrawal by Alice', async () => {
      it('Try to fill partially', async () => {
        const { eve } = await getNamedAccounts();
        const alice = await ethers.getNamedSigner('alice');

        const pendingWithdrawal = await vault.pendingWithdrawals(eve, 0);

        await expect(vault
          .connect(alice)
          ['deposit((int128,uint256),uint256,(address,uint256))'](
            defaultTonRecipient,
            pendingWithdrawal.amount.sub(1),
            [eve, 0]
          )).to.be.reverted;
      });

      it('Fill pending withdrawal', async () => {
        const alice = await ethers.getNamedSigner('alice');
        const eve = await ethers.getNamedSigner('eve');

        const pendingWithdrawal = await vault.pendingWithdrawals(eve.address, 0);

        const deposit = pendingWithdrawal.amount; // It's possible to add some value over the deposit amount
        const toBeWithdrawn = pendingWithdrawal.amount.sub(pendingWithdrawal.bounty);

        await expect(() => vault
          .connect(alice)
          ['deposit((int128,uint256),uint256,(address,uint256))'](
            defaultTonRecipient,
            deposit,
            [eve.address, 0]
          ))
          .to.changeTokenBalances(
            dai,
          [alice, eve, vault],
          [
            ethers.BigNumber.from(0).sub(deposit),
            toBeWithdrawn,
            deposit.sub(toBeWithdrawn)
          ]);

        // Two 'Deposit' events should be emitted
        // First one with `amount`, second one with bounty
        const [,depositEvent,bountyEvent] = await vault.queryFilter(
            vault.filters.Deposit(), 0, "latest"
        );

        expect(depositEvent.args.amount)
          .to.be.equal(await vault.convertToTargetDecimals(deposit), 'Wrong deposit amount');
        expect(bountyEvent.args.amount)
            .to.be.equal(await vault.convertToTargetDecimals(pendingWithdrawal.bounty), 'Wrong bounty amount');
      });

      it('Check Eves pending withdrawal closed', async () => {
        const { eve } = await getNamedAccounts();

        expect(await vault.pendingWithdrawalsPerUser(eve))
          .to.be.equal(1,' Eve should has pending withdrawal');

        const withdrawal = await vault.pendingWithdrawals(eve, 0);

        expect(withdrawal.amount)
          .to.be.equal(0, 'Eve pending withdrawal should be closed');
      });

      it('Check total pending withdrawals', async () => {
        expect(await vault.pendingWithdrawalsTotal())
          .to.be.equal(0, 'Total pending withdrawals wrong');
      });
    });
  });
});
