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

      await expect(() => vault['saveWithdraw(bytes,bytes[])'](payload, signatures))
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
      await expect(vault['saveWithdraw(bytes,bytes[])'](payload, signatures)).to.be.reverted;
    });
  });

  describe('Create pending withdrawals and fill it with bounty', async () => {
    const eveWithdrawAmount = ethers.utils.parseUnits('600', 18);
    const eveWithdrawBounty = ethers.utils.parseUnits('10', 18);
    const bobWithdrawAmount = ethers.utils.parseUnits('700', 18);
    const bobWithdrawBounty = ethers.utils.parseUnits('300', 18);

    it('Check Eve and Bob has no pending withdrawals', async () => {
      const { eve, bob } = await getNamedAccounts();

      expect(await vault.pendingWithdrawalsPerUser(eve))
        .to.be.equal(0,' Eve should not has pending withdrawals');
      expect(await vault.pendingWithdrawalsPerUser(bob))
          .to.be.equal(0,' Eve should not has pending withdrawals');
    });

    it('Withdraw 600 dai to Eve (more than Vault has, less than limits)', async () => {
      const eve = await ethers.getNamedSigner('eve');

      const withdrawalEventData = await encodeWithdrawalData({
        amount: await vault.convertToTargetDecimals(eveWithdrawAmount),
        recipient: eve.address
      });

      const payload = encodeEverscaleEvent({
        eventData: withdrawalEventData,
        proxy: vault.address
      });

      const signatures = await utils.getPayloadSignatures(payload);

      await expect(() => vault.connect(eve)['saveWithdraw(bytes,bytes[],uint256)'](payload, signatures, eveWithdrawBounty))
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
        .to.be.equal(eveWithdrawAmount, 'Wrong amount');

      expect(withdrawal.bounty)
        .to.be.equal(eveWithdrawBounty, 'Wrong bounty');

      expect(withdrawal.approveStatus)
          .to.be.equal(0, 'Wrong approve status');
    });

    it('Withdraw 700 dai to Bob (more than Vault has, more than limits)', async () => {
      const bob = await ethers.getNamedSigner('bob');

      const withdrawalEventData = await encodeWithdrawalData({
        amount: await vault.convertToTargetDecimals(bobWithdrawAmount),
        recipient: bob.address
      });

      const payload = encodeEverscaleEvent({
        eventData: withdrawalEventData,
        proxy: vault.address
      });

      const signatures = await utils.getPayloadSignatures(payload);

      await expect(() => vault['saveWithdraw(bytes,bytes[])'](payload, signatures))
          .to.changeTokenBalances(
              dai,
              [vault, bob],
              [0, 0]
          );

    });

    it('Set the bounty for Bob pending withdrawal', async () => {
      const bob = await ethers.getNamedSigner('bob');

      await vault.connect(bob).setPendingWithdrawalBounty(0, bobWithdrawBounty);
    });

    it('Approve Bob withdrawal', async () => {
      const withdrawGuardian = await ethers.getNamedSigner('withdrawGuardian');
      const bob = await ethers.getNamedSigner('bob');

      await vault
          .connect(withdrawGuardian)
          ['setPendingWithdrawalApprove((address,uint256),uint8)']([bob.address, 0], 2);
    });

    it('Check Bob pending withdrawal', async () => {
      const { bob } = await getNamedAccounts();

      expect(await vault.pendingWithdrawalsPerUser(bob))
          .to.be.equal(1,' Bob should has pending withdrawal');

      const withdrawal = await vault.pendingWithdrawals(bob, 0);

      expect(withdrawal.amount)
          .to.be.equal(bobWithdrawAmount, 'Wrong amount');

      expect(withdrawal.bounty)
          .to.be.equal(bobWithdrawBounty, 'Wrong bounty');

      expect(withdrawal.approveStatus)
          .to.be.equal(2, 'Wrong approve status');
    });

    it('Check total pending withdrawals', async () => {
      expect(await vault.pendingWithdrawalsTotal())
        .to.be.equal(bobWithdrawAmount.add(eveWithdrawAmount), 'Total pending withdrawals wrong');
    });

    describe('Fill pending withdrawals with deposit', async () => {
      it('Try to fill partially', async () => {
        const { eve } = await getNamedAccounts();
        const alice = await ethers.getNamedSigner('alice');

        const pendingWithdrawal = await vault.pendingWithdrawals(eve, 0);

        await expect(vault
          .connect(alice)
          ['deposit((int128,uint256),uint256,uint256,(address,uint256)[])'](
            defaultTonRecipient,
            pendingWithdrawal.amount.sub(1),
            pendingWithdrawal.bounty,
            [[eve, 0]]
          )).to.be.reverted;
      });

      it('Try to fill with minBounty less than bounty', async () => {
        const { eve } = await getNamedAccounts();
        const alice = await ethers.getNamedSigner('alice');

        const pendingWithdrawal = await vault.pendingWithdrawals(eve, 0);

        await expect(vault
            .connect(alice)
            ['deposit((int128,uint256),uint256,uint256,(address,uint256)[])'](
            defaultTonRecipient,
            pendingWithdrawal.amount,
            pendingWithdrawal.bounty.add(1),
            [[eve, 0]]
        )).to.be.reverted;
      });

      it('Fill both pending withdrawals at one deposit', async () => {
        const alice = await ethers.getNamedSigner('alice');
        const eve = await ethers.getNamedSigner('eve');
        const bob = await ethers.getNamedSigner('bob');

        const deposit = eveWithdrawAmount.add(bobWithdrawAmount).add(100000); // It's possible to add some value over the deposit amount

        const eveToBeWithdrawn = eveWithdrawAmount.sub(eveWithdrawBounty);
        const bobToBeWithdrawn = bobWithdrawAmount.sub(bobWithdrawBounty);

        await expect(() => vault
          .connect(alice)
            ['deposit((int128,uint256),uint256,uint256,(address,uint256)[])'](
            defaultTonRecipient,
            deposit,
            eveWithdrawBounty.add(bobWithdrawBounty),
            [[eve.address, 0], [bob.address, 0]]
          ))
          .to.changeTokenBalances(
            dai,
          [alice, eve, bob, vault],
          [
            ethers.BigNumber.from(0).sub(deposit),
            eveToBeWithdrawn,
            bobToBeWithdrawn,
            deposit.sub(eveToBeWithdrawn).sub(bobToBeWithdrawn)
          ]);

        // Two 'Deposit' events should be emitted
        // First one with `amount`, second one with bounty
        const events = await vault.queryFilter(
            vault.filters.Deposit(), 0, "latest"
        );

        // 1 deposit was emitted on 'deposit' above
        expect(events)
            .to.have.lengthOf(2, 'Only 1 Deposit event should be emitted');

        const [,aliceDeposit] = events;

        expect(aliceDeposit.args.amount)
            .to.be.equal(
                await vault.convertToTargetDecimals(deposit.add(eveWithdrawBounty).add(bobWithdrawBounty)),
            'Wrong deposit amount'
        );

        expect(aliceDeposit.args.wid)
            .to.be.equal(defaultTonRecipient.wid, 'Wrong deposit wid recipient');
        expect(aliceDeposit.args.addr)
            .to.be.equal(defaultTonRecipient.addr, 'Wrong deposit addr recipient');
      });

      it('Check pending withdrawals closed', async () => {
        const { eve, bob } = await getNamedAccounts();

        const eveWithdrawal = await vault.pendingWithdrawals(eve, 0);
        const bobWithdrawal = await vault.pendingWithdrawals(bob, 0);

        expect(eveWithdrawal.amount)
          .to.be.equal(0, 'Eve pending withdrawal should be closed');
        expect(bobWithdrawal.amount)
            .to.be.equal(0, 'Eve pending withdrawal should be closed');
      });

      it('Check total pending withdrawals', async () => {
        expect(await vault.pendingWithdrawalsTotal())
          .to.be.equal(0, 'Total pending withdrawals wrong');
      });
    });
  });
});
