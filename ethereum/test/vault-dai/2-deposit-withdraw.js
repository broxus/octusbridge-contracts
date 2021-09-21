const { legos } = require('@studydefi/money-legos');
const {
  expect,
  defaultConfiguration,
  defaultTonRecipient,
  getVaultByToken,
  generateWallets,
  encodeTonEvent,
  encodeWithdrawalData,
  ...utils
} = require('../utils');


describe('Test Vault DAI deposit', async () => {
  let vault, wrapper, dai;

  it('Setup contracts', async () => {
    await deployments.fixture();
  
    dai = await ethers.getContractAt(
      legos.erc20.abi,
      legos.erc20.dai.address,
    );
  });

  it('Create vault', async () => {
    const owner = await ethers.getNamedSigner('owner');
    const { guardian } = await getNamedAccounts();
  
    const registry = await ethers.getContract('Registry');
  
    await registry.connect(owner).newVault(
      dai.address,
      guardian,
      0,
      0,
    );
  
    vault = await getVaultByToken(registry, dai.address);
  
    wrapper = await ethers.getContractAt(
      'VaultWrapper',
      (await vault.wrapper())
    );
  });
  
  it('Set configuration', async () => {
    const owner = await ethers.getNamedSigner('owner');
    
    await vault
      .connect(owner)
      .setConfiguration(defaultConfiguration);
  });
  
  it('Set deposit limit', async () => {
    const depositLimit = ethers.utils.parseUnits('10000', 18);
  
    const owner = await ethers.getNamedSigner('owner');
    
    await vault
      .connect(owner)
      .setDepositLimit(depositLimit);
  });

  it('Fill Alice balance with Dai', async () => {
    const { alice, dai_owner } = await getNamedAccounts();
  
    await utils.issueTokens({
      token: dai,
      owner: dai_owner,
      recipient: alice,
      amount: ethers.utils.parseUnits('100000', 18)
    });
  });

  it('Alice infinite approve on vault', async () => {
    const alice = await ethers.getNamedSigner('alice');

    await dai
      .connect(alice)
      .approve(vault.address, ethers.utils.parseUnits('1000000000000', 18));
  });
  
  describe('Deposit', async () => {
    const amount = ethers.utils.parseUnits('1000', 18);

    it('Alice deposits 1000 dai', async () => {
      const alice = await ethers.getNamedSigner('alice');
    
      const recipient = {
        wid: 0,
        addr: 123123
      };
      
      await expect(
        wrapper
          .connect(alice)
          .deposit(recipient, amount)
      )
        .to.emit(vault, 'Deposit')
        .withArgs(amount, recipient.wid, recipient.addr);
    });
    
    it('Check total assets', async () => {
      expect(await vault.totalAssets())
        .to.be.equal(amount, 'Wrong total assets');
    });
  });
  
  describe('Instantly withdraw 500 dai to Bob', async () => {
    const amount = ethers.utils.parseUnits('500', 18);

    let payload, signatures;
    
    it('Check Bob balance is 0', async () => {
      const { bob } = await getNamedAccounts();

      expect(await dai.balanceOf(bob))
        .to.be.equal(0, 'Bob should not has dai at this moment');
    });
    
    it('Check Bob doesnt have pending withdrawals', async () => {
      const { bob } = await getNamedAccounts();

      expect(await vault.pendingWithdrawalsPerUser(bob))
        .to.be.equal(0,' Bob should not has pending withdrawals');
    });
    
    it('Prepare payload & signatures', async () => {
      const { bob } = await getNamedAccounts();

      const withdrawalEventData = await encodeWithdrawalData({
        amount: amount.toString(),
        recipient: bob
      });
      
      payload = encodeTonEvent({
        eventData: withdrawalEventData,
        proxy: vault.address
      });

      const initialRelays = utils.sortAccounts(await ethers.getSigners());
  
      signatures = await Promise.all(initialRelays
        .map(async (account) => utils.signReceipt(payload, account)));
    });
    
    it('Save withdraw with wrapper', async () => {
      const bob = await ethers.getNamedSigner('bob');

      await expect(() => wrapper.saveWithdraw(payload, signatures, 0))
        .to.changeTokenBalances(
          dai,
          [vault, bob],
          [ethers.BigNumber.from(0).sub(amount), amount]
        );
    });
    
    it('Check Bob didnt receive pending withdrawal', async () => {
      const { bob } = await getNamedAccounts();
  
      expect(await vault.pendingWithdrawalsPerUser(bob))
        .to.be.equal(0,' Bob should not has pending withdrawals');
    });
    
    it('Check total pending withdrawals', async () => {
      expect(await vault.pendingWithdrawalsTotal())
        .to.be.equal(0, 'Total pending withdrawals should be zero');
    });
    
    it('Try to reuse payload', async () => {
      await expect(wrapper.saveWithdraw(payload, signatures, 0))
        .to.be.revertedWith("Vault: withdraw already seen");
    });
  });
  
  describe('Create pending withdrawal to Eve', async () => {
    const amount = ethers.utils.parseUnits('600', 18);
    const bounty = ethers.utils.parseUnits('10', 18);
  
    it('Check Eve doesnt have pending withdrawals', async () => {
      const { eve } = await getNamedAccounts();
    
      expect(await vault.pendingWithdrawalsPerUser(eve))
        .to.be.equal(0,' Eve should not has pending withdrawals');
    });
  
    it('Create withdrawal for 600 dai to Eve', async () => {
      const eve = await ethers.getNamedSigner('eve');

      const withdrawalEventData = await encodeWithdrawalData({
        amount: amount.toString(),
        recipient: eve.address
      });
  
      const payload = encodeTonEvent({
        eventData: withdrawalEventData,
        proxy: vault.address
      });
  
      const initialRelays = utils.sortAccounts(await ethers.getSigners());
  
      const signatures = await Promise.all(initialRelays
        .map(async (account) => utils.signReceipt(payload, account)));
    
      await expect(() => wrapper.connect(eve).saveWithdraw(payload, signatures, bounty))
        .to.changeTokenBalances(
          dai,
          [vault, eve],
          [0, 0]
        );
    });
    
    it('Check Eves pending withdrawal', async () => {
      const { eve } = await getNamedAccounts();
      
      expect(await vault.pendingWithdrawalsPerUser(eve))
        .to.be.equal(1,' Eve should has pending withdrawal');
      
      const withdrawal = await vault.pendingWithdrawals(eve, 0);
      
      expect(withdrawal.open)
        .to.be.equal(true, 'Eve pending withdrawal should be open');
      
      expect(withdrawal.amount)
        .to.be.equal(amount, 'Eve pending withdrawal amount wrong');
  
      expect(withdrawal.bounty)
        .to.be.equal(bounty, 'Eve pending withdrawal bounty wrong');
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
        
        await expect(wrapper
          .connect(alice)
          .depositWithFillings(
            defaultTonRecipient,
            pendingWithdrawal.amount.sub(1),
            [
              [eve, 0]
            ]
          )).to.be.revertedWith("Vault: too low deposit for specified fillings");
      });
      
      it('Fill pending withdrawal', async () => {
        const alice = await ethers.getNamedSigner('alice');
        const eve = await ethers.getNamedSigner('eve');
  
        const pendingWithdrawal = await vault.pendingWithdrawals(eve.address, 0);
  
        const deposit = pendingWithdrawal.amount.add(1); // It's possible to add some value over the deposit amount
        const toBeWithdrawn = pendingWithdrawal.amount.sub(pendingWithdrawal.bounty);
        
        await expect(() => wrapper
          .connect(alice)
          .depositWithFillings(
            defaultTonRecipient,
            deposit,
            [
              [eve.address, 0]
            ]
          ))
          .to.changeTokenBalances(
            dai,
          [eve, vault, alice],
          [
            toBeWithdrawn,
            deposit.sub(toBeWithdrawn),
            ethers.BigNumber.from(0).sub(deposit)
          ]);
        
        // Get latest 'Deposit' event and check emitted amount
        const depositEvent = (await vault.queryFilter(
          vault.filters.Deposit(), 0, "latest"
        )).pop();
        
        expect(depositEvent.args.amount)
          .to.be.equal(deposit.add(pendingWithdrawal.bounty), 'Wrong deposit amount emitted after filling pending');
      });
  
      it('Check Eves pending withdrawal closed', async () => {
        const { eve } = await getNamedAccounts();
    
        expect(await vault.pendingWithdrawalsPerUser(eve))
          .to.be.equal(1,' Eve should has pending withdrawal');
    
        const withdrawal = await vault.pendingWithdrawals(eve, 0);
    
        expect(withdrawal.open)
          .to.be.equal(false, 'Eve pending withdrawal should be closed');
      });
  
      it('Check total pending withdrawals', async () => {
        expect(await vault.pendingWithdrawalsTotal())
          .to.be.equal(0, 'Total pending withdrawals wrong');
      });
    });
  });
});
