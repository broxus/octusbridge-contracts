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

const BPS = 10_000;
const DEPOSIT_FEE = 100; // 1%
const WITHDRAW_FEE = 200; // 2%

const depositAmount = ethers.utils.parseUnits('100', 18);
const withdrawAmount = ethers.utils.parseUnits('50', 18);
const depositFee = depositAmount.mul(DEPOSIT_FEE).div(BPS);
const withdrawFee = withdrawAmount.mul(WITHDRAW_FEE).div(BPS);


describe('Check deposit / withdraw fees', async () => {
  let vault, dai;

  it('Setup contracts', async () => {
    await deployments.fixture();

    dai = await ethers.getContractAt(
      legos.erc20.abi,
      legos.erc20.dai.address,
    );
    vault = await ethers.getContract('VaultDai');
  });

  describe('Check deposit fee', async () => {
    it('Set non-zero deposit fee', async () => {
      const owner = await ethers.getNamedSigner('owner');

      await vault
        .connect(owner)
        .setDepositFee(DEPOSIT_FEE);
    });

    it('Check deposit fee', async () => {
      expect(await vault.depositFee())
          .to.be.equal(DEPOSIT_FEE, 'Wrong deposit fee');
    });

    it('Alice deposits 100 dai', async () => {
      const alice = await ethers.getNamedSigner('alice');

      const recipient = {
        wid: 0,
        addr: 123123
      };

      await vault
          .connect(alice)
          ['deposit((int128,uint256),uint256)'](recipient, depositAmount);

      // Check deposit amount and deposit fee events
      const events = await vault.queryFilter(
          vault.filters.Deposit(), 0, "latest"
      );

      expect(events)
          .to.have.lengthOf(1, 'Only 2 Deposit events should be emitted');

      const [depositEvent] = events;

      // - Check deposit event
      expect(depositEvent.args.amount)
          .to.be.equal(await vault.convertToTargetDecimals(depositAmount.sub(depositFee)), 'Wrong deposit amount');
      expect(depositEvent.args.wid)
          .to.be.equal(recipient.wid, 'Wrong deposit wid recipient');
      expect(depositEvent.args.addr)
          .to.be.equal(recipient.addr, 'Wrong deposit addr recipient');

      expect(await vault.fees())
          .to.be.equal(depositFee, 'Wrong fees amount after deposit');
    });
  });

  describe('Check withdraw fee', async () => {
    it('Set non-zero withdraw fee', async () => {
      const owner = await ethers.getNamedSigner('owner');

      await vault
          .connect(owner)
          .setWithdrawFee(WITHDRAW_FEE);
    });

    it('Check withdraw fee', async () => {
      expect(await vault.withdrawFee())
          .to.be.equal(WITHDRAW_FEE, 'Wrong withdraw fee');
    });

    it('Withdraw 50 dai to Bob and check withdraw fee considered', async () => {
      const bob = await ethers.getNamedSigner('bob');

      const withdrawalEventData = encodeWithdrawalData({
        amount: await vault.convertToTargetDecimals(withdrawAmount),
        recipient: bob.address
      });

      const payload = encodeEverscaleEvent({
        eventData: withdrawalEventData,
        proxy: vault.address,
      });

      const signatures = await utils.getPayloadSignatures(payload);

      await expect(() => vault['saveWithdraw(bytes,bytes[])'](payload, signatures))
          .to.changeTokenBalances(
              dai,
              [vault, bob],
              [
                ethers.BigNumber.from(0, 10).sub(withdrawAmount).add(withdrawFee),
                withdrawAmount.sub(withdrawFee)
              ]
          );
    });

    it('Check no new Deposit events emitted', async () => {
      const events = (await vault.queryFilter(
          vault.filters.Deposit(), 0, "latest"
      ));

      expect(events)
          .to.have.lengthOf(1, 'No new deposits should be emitted');
    });

    it('Check fees increased', async () => {
      expect(await vault.fees())
          .to.be.equal(depositFee.add(withdrawFee), 'Wrong fees after deposit');
    });
  });

  describe('Skim fees', async () => {
    it('Skim fees', async () => {
      const fees = await vault.fees();
      const rewards = await vault.rewards();

      const owner = await ethers.getNamedSigner('owner');

      await expect(vault.connect(owner).skimFees(true))
          .to.emit(vault, 'Deposit')
          .withArgs(
              await vault.convertToTargetDecimals(fees),
              rewards.wid,
              rewards.addr
          );
    });

    it('Check fees equals to zero after skim', async () => {
      expect(await vault.fees())
          .to.be.equal(0, 'Fees are non-zero after skim');
    });
  });
});
