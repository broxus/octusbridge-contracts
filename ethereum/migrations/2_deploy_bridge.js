require('dotenv').config({ path: './../../env/ethereum.env' });

const EthereumBridge = artifacts.require("EthereumBridge");

module.exports = async (deployer, network ,accounts) => {
  await deployer.deploy(
    EthereumBridge,
    accounts,
    process.env.BRIDGE_INITIAL_REQUIRED_OWNERS_TO_EXECUTE_CALL,
    process.env.BRIDGE_INITIAL_REQUIRED_OWNERS_TO_UPDATE_OWNERS,
  );
};
