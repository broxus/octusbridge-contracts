require('dotenv').config({ path: './../../env/ethereum.env' });

const EthereumBridge = artifacts.require("EthereumBridge");
const EventContractSimple = artifacts.require("EventContractSimple");

module.exports = async (deployer, network ,accounts) => {
  await deployer.deploy(
    EthereumBridge,
    accounts,
  );
  
  await deployer.deploy(EventContractSimple);
};
