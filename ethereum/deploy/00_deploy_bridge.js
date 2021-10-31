const utils = require('./../test/utils');


module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer, owner, roundSubmitter } = await getNamedAccounts();
  
  const initialRelays = await utils.getInitialRelays();
  const week = 604800;
  
  const initialRoundEnd = Math.floor(new Date() / 1000) + week;
  
  console.log(`Bridge owner: ${owner}`);
  console.log(`Round submitter: ${roundSubmitter}`);
  console.log(`Initial relays amount: ${initialRelays.length}`);
  console.log(`Initial relays: ${initialRelays.map(a => a.address)}`);
  console.log(`Initial round end: ${new Date(initialRoundEnd * 1000)}`);
  
  await deployments.deploy('Bridge', {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          owner,
          roundSubmitter,
          9, // Minimum required signatures
          2 * week, // Relay TTL after round in seconds, 1 week
          0, // Initial round number
          initialRoundEnd, // Initial round end, after 1 week
          initialRelays.map(a => a.address), // Initial relays
        ],
      }
    }
  });
};

module.exports.tags = ['Deploy_Bridge'];
