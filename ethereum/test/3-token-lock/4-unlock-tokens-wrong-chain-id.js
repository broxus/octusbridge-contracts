const {
  logger,
  expect,
  ...utils
} = require('../utils');


describe('Unlock tokens with payload with wrong chain id', async () => {
  let tokenLock, payload, signatures;
  
  it('Setup contracts', async () => {
    await deployments.fixture();
    
    tokenLock = await ethers.getContract('TokenLock_usdt');
  });
  
  it('Prepare payload & signatures', async () => {
    const initialRelays = utils.sortAccounts(await ethers.getSigners());
    
    const eventData = web3.eth.abi.encodeParameters(
      ['int8', 'uint256', 'uint128', 'uint128','uint160', 'uint32'],
      [0, 0, 0, 0, ethers.constants.AddressZero, utils.chainId + 1],
    );
    
    payload = utils.encodeTonEvent({
      eventData,
      proxy: tokenLock.address,
    });
    
    signatures = await Promise.all(initialRelays
      .map(async (account) => utils.signReceipt(payload, account)));
  });
  
  it('Execute', async () => {
    expect(tokenLock.unlockTokens(payload, signatures))
      .to.be.revertedWith('Token lock: Wrong chain id');
  });
});
