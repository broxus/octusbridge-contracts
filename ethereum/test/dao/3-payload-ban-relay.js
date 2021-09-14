const {
  expect,
  encodeDaoActions,
  encodeTonEvent,
  defaultConfiguration,
  ...utils
} = require('../utils');


describe('Execute banning relay by DAO', async () => {
  let dao, bridge;

  it('Setup contracts', async () => {
    await deployments.fixture();
    
    dao = await ethers.getContract('DAO');
    bridge = await ethers.getContract('Bridge');
  });
  
  it('Setup DAO event configuration', async () => {
    const owner = await ethers.getNamedSigner('owner');

    await dao
      .connect(owner)
      .updateConfiguration(defaultConfiguration);
  });
  
  it('Transfer Bridge ownership to DAO', async () => {
    const owner = await ethers.getNamedSigner('owner');
  
    await bridge
      .connect(owner)
      .transferOwnership(dao.address);
  });
  
  let relayToBeBanned;
  
  it('Setup relay to be banned', async () => {
    const {
      stranger
    } = await getNamedAccounts();
  
    relayToBeBanned = stranger;
  });
  
  it('Check relay not banned', async () => {
    expect(await bridge.isBanned(relayToBeBanned))
      .to.be.equal(false, 'Relay should not be banned');
  });
  
  let payload, signatures;
  
  it('Execute proposal with banning stranger ', async () => {
    const {
      data: actionData
    } = await bridge.populateTransaction.banRelays([relayToBeBanned]);
    
    const actions = encodeDaoActions([{
      value: 0,
      target: bridge.address,
      signature: '',
      data: actionData
    }]);
  
    payload = encodeTonEvent({
      eventData: actions,
      proxy: dao.address,
    });
  
    const initialRelays = utils.sortAccounts(await utils.getInitialRelays());
  
    signatures = await Promise.all(initialRelays
      .map(async (account) => utils.signReceipt(payload, account)));
  
    await dao.execute(payload, signatures);
  });
  
  it('Check relay banned', async () => {
    expect(await bridge.isBanned(relayToBeBanned))
      .to.be.equal(true, 'Relay should be banned');
  });
  
  it('Try to reuse payload', async () => {
    await expect(dao.execute(payload, signatures))
      .to.be.revertedWith('Cache: payload already seen');
  });
});
