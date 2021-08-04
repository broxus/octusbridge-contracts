const {
  setupBridge,
  setupEthereumEventConfiguration,
  setupTonEventConfiguration,
  enableEventConfiguration,
} = require('./../test/utils');

const _ = require('underscore');


const relays = [
  {
    public: '94fd93f0890b3cb9f8cccafcd8d0caf6a635b6103f5e6b05123982aa63b7abda'
  }
];

const configurationsAmount = 10;


const main = async () => {
  const [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

  for (const configurationId of _.range(configurationsAmount)) {
    console.log(`Ethereum event configuration #${configurationId}`);
  
    const [ethereumEventConfiguration] = await setupEthereumEventConfiguration(
      bridgeOwner,
      staking,
      cellEncoder,
    );
  
    await enableEventConfiguration(
      bridgeOwner,
      bridge,
      ethereumEventConfiguration,
    );
  }
  
  for (const configurationId of _.range(configurationsAmount)) {
    console.log(`Ton event configuration #${configurationId}`);

    const [tonEventConfiguration] = await setupTonEventConfiguration(
      bridgeOwner,
      staking,
      cellEncoder,
    );
  
    await enableEventConfiguration(
      bridgeOwner,
      bridge,
      tonEventConfiguration,
    );
  }
};


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
