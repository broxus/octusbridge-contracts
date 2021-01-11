require('dotenv').config({ path: './../../env/ethereum.env' });

const EthereumBridge = artifacts.require("EthereumBridge");
const EventContractExample = artifacts.require("EventContractExample");


module.exports = async (deployer, network ,accounts) => {
  await deployer.deploy(
    EthereumBridge,
    accounts.slice(0, process.env.BRIDGE_INITIAL_OWNERS),
  );
  
  await deployer.deploy(EventContractExample);
};
