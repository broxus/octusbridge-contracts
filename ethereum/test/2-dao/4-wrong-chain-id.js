const {
  logger,
  expect,
  ...utils
} = require('../utils');


describe('Use payload with wrong chain id', async () => {
  let dao, payload, signatures;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    dao = await ethers.getContract('DAO');
    
    logger.log(`DAO: ${dao.address}`);
  });
  
  it('Prepare payload & signatures with wrong chain id', async () => {
    const actions = utils.encodeDaoActions([{
      target: dao.address,
      data: '0x'
    }], utils.chainId + 1);
  
    payload = utils.encodeTonEvent({
      eventData: actions,
      proxy: dao.address,
    });

    const initialRelays = utils.sortAccounts(await ethers.getSigners());

    signatures = await Promise.all(initialRelays
      .map(async (account) => utils.signReceipt(payload, account)));
  });
  
  it('Execute', async () => {
    expect(dao.execute(payload, signatures))
      .to.be.revertedWith('DAO: wrong chain id');
  });
});
