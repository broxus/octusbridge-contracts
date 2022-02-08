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
      const amount = ethers.utils.parseUnits('100', 18);

      const recipient = {
        wid: 0,
        addr: 123123
      };

      await vault
          .connect(alice)
          ['deposit((int128,uint256),uint256)'](recipient, amount);

      // Calculate expected fee amount
      const fee = amount.mul(DEPOSIT_FEE).div(BPS);

      // Check deposit amount and deposit fee events
      const events = await vault.queryFilter(
          vault.filters.Deposit(), 0, "latest"
      );

      expect(events)
          .to.have.lengthOf(2, 'Only 2 Deposit events should be emitted');

      const [depositEvent, depositFeeEvent] = events;

      // - Check deposit event
      expect(depositEvent.args.amount)
          .to.be.equal(await vault.convertToTargetDecimals(amount.sub(fee)), 'Wrong deposit amount');
      expect(depositEvent.args.wid)
          .to.be.equal(recipient.wid, 'Wrong deposit wid recipient');
      expect(depositEvent.args.addr)
          .to.be.equal(recipient.addr, 'Wrong deposit addr recipient');

      // - Check fee deposit event
      const rewards = await vault.rewards();

      expect(depositFeeEvent.args.amount)
          .to.be.equal(await vault.convertToTargetDecimals(fee), 'Wrong fee amount');
      expect(depositFeeEvent.args.wid)
          .to.be.equal(rewards.wid, 'Wrong rewards wid');
      expect(depositFeeEvent.args.addr)
          .to.be.equal(rewards.addr, 'Wrong rewards addr');
    });
  });
  
  describe('Check withdraw fee', async () => {
    const amount = ethers.utils.parseUnits('50', 18);
    const fee = amount.mul(WITHDRAW_FEE).div(BPS);

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
        amount: await vault.convertToTargetDecimals(amount),
        recipient: bob.address
      });

      const payload = encodeEverscaleEvent({
        eventData: withdrawalEventData,
        proxy: vault.address,
      });

      const signatures = await utils.getPayloadSignatures(payload);

      const fee = amount.mul(WITHDRAW_FEE).div(BPS);

      await expect(() => vault['saveWithdrawal(bytes,bytes[])'](payload, signatures))
          .to.changeTokenBalances(
              dai,
              [vault, bob],
              [ethers.BigNumber.from(0, 10).sub(amount).add(fee), amount.sub(fee)]
          );
    });

    it('Check withdraw fee considered', async () => {
      const events = (await vault.queryFilter(
          vault.filters.Deposit(), 0, "latest"
      ));

      expect(events)
          .to.have.lengthOf(3, 'Only 1 Deposit event should be emitted');

      const [,,withdrawFeeEvent] = events;

      const rewards = await vault.rewards();

      expect(withdrawFeeEvent.args.amount)
          .to.be.equal(await vault.convertToTargetDecimals(fee), 'Wrong fee amount');
      expect(withdrawFeeEvent.args.wid)
          .to.be.equal(rewards.wid, 'Wrong rewards wid');
      expect(withdrawFeeEvent.args.addr)
          .to.be.equal(rewards.addr, 'Wrong rewards addr');
    });
  });
});
