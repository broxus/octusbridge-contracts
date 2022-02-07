const {
  logger,
  expect,
  defaultConfiguration,
  ...utils
} = require('../utils');


describe('Use payload with wrong chain id', async () => {
  let dao, payload, signatures;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    dao = await ethers.getContract('DAO');
  });
  
  it('Set DAO configuration', async () => {
    const owner = await ethers.getNamedSigner('owner');

    await dao
      .connect(owner)
      .updateConfiguration(defaultConfiguration);
  });
  
  it('Prepare payload & signatures with wrong chain id', async () => {
    const actions = utils.encodeDaoActions([{
      target: dao.address,
      data: '0x'
    }], utils.defaultChainId + 1);
  
    payload = utils.encodeEverscaleEvent({
      eventData: actions,
      proxy: dao.address,
    });

    const initialRelays = utils.sortAccounts(await utils.getInitialRelays());

    signatures = await Promise.all(initialRelays
      .map(async (account) => utils.signReceipt(payload, account)));
  });
  
  it('Execute', async () => {
    await expect(dao.execute(payload, signatures))
      .to.be.revertedWith('DAO: wrong chain id');
  });
});
