describe('Test bridge upgradability', async function() {
  before(async function() {
    const accounts = await ethers.getSigners();
  
    const Bridge = await ethers.getContractFactory("Bridge");
    bridge = await upgrades.deployProxy(
      Bridge,
      [
        accounts.map(a => a.address),
        accounts[0].address,
        [1, 2]
      ]
    );
  });
});
