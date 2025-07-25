import { Address, Contract, toNano } from "locklift";

import {
  BridgeAbi,
  ProxyMultiVaultAlien_V10Abi,
  ProxyMultiVaultNative_V8Abi,
  RoundDeployerAbi,
  EthereumEverscaleEventConfigurationAbi,
  EverscaleEthereumEventConfigurationAbi,
  ConnectorAbi,
  MergeRouterAbi,
  MergePool_V7Abi,
  Mediator_V2Abi,
  EventCreditFactoryAbi,
} from "../../build/factorySource";

const NEW_OWNER = new Address("");

type internalOwnerContractsType =
  | BridgeAbi
  | ProxyMultiVaultAlien_V10Abi
  | ProxyMultiVaultNative_V8Abi
  | EthereumEverscaleEventConfigurationAbi
  | EverscaleEthereumEventConfigurationAbi
  | ConnectorAbi
  | MergeRouterAbi
  | MergePool_V7Abi
  | Mediator_V2Abi
  | EventCreditFactoryAbi;

const internalOwnerContracts = [
  "Bridge",
  "ProxyMultiVaultAlien",
  "ProxyMultiVaultNative",
  "RoundDeployerConfiguration",
  "NetworkConfig",
  "Connector",
  "MergeRouter",
  "MergePool",
  "Mediator",
  "EventCreditFactory",
];

const main = async (): Promise<void> => {
  await locklift.deployments.load();

  const admin = locklift.deployments.getAccount("Admin").account;

  for (const deployment of Object.entries(locklift.deployments.deploymentsStore)) {
    if (deployment[0] == "RoundDeployer") {
      const roundDeployer: Contract<RoundDeployerAbi> = await locklift.factory.getDeployedContract(
        deployment[0],
        (deployment[1] as any).address,
      );
      await roundDeployer.methods
        .setAdmin({ new_admin: NEW_OWNER, send_gas_to: admin.address })
        .send({ from: admin.address, amount: toNano(30) });
      console.log(
        `${deployment[0]} new owner:`,
        await roundDeployer.methods
          .getDetails({ answerId: 0 })
          .call()
          .then(a => a.value0.admin.toString()),
      );

      continue;
    }

    if (internalOwnerContracts.filter(contractName => deployment[0].includes(contractName)).length) {
      const contract: Contract<internalOwnerContractsType> = await locklift.deployments.getContract(deployment[0]);
      await contract.methods
        .transferOwnership({ newOwner: NEW_OWNER })
        .send({ from: admin.address, amount: toNano(0.2) });
      console.log(
        `${deployment[0]} new owner:`,
        await contract.methods
          .owner({})
          .call()
          .then(a => a.owner.toString()),
      );
    }
  }
};

main().then(() => console.log("Success"));
