import { TransactionId, Address } from "locklift";

import { BridgeAbi } from "../../build_prod/factorySource";

const main = async (): Promise<void> => {
  const bridge = locklift.deployments.getContract<BridgeAbi>("Bridge");

  let cont: TransactionId | undefined = undefined;
  const configurations: Address[] = [];

  do {
    const { events, continuation } = await bridge.getPastEvents({
      filter: "ConnectorDeployed" as const,
      continuation: cont,
    });

    cont = continuation;
    configurations.push(...events.map((e) => e.data.eventConfiguration));
  } while (!!cont);

  const activeConfigurations: { type: 'block' | 'timestamp', address: string }[] = [];

  for (const config of configurations) {
    try {
      const contract = locklift.factory.getDeployedContract("EverscaleEthereumEventConfiguration", config);

      const details = await contract.methods
        .getDetails({ answerId: 0 })
        .call({ responsible: true });

      if (+details._networkConfiguration.endTimestamp === 0) {
        activeConfigurations.push({
          type: 'timestamp',
          address: config.toString(),
        });
      }
    } catch (e) {
      try {
        const contract = locklift.factory.getDeployedContract("EthereumEverscaleEventConfiguration", config);

        const details = await contract.methods
          .getDetails({ answerId: 0 })
          .call({ responsible: true });

        if (+details._networkConfiguration.endBlockNumber === 0) {
          activeConfigurations.push({
            type: 'block',
            address: config.toString(),
          });
        }
      } catch (e) {
        const contract = locklift.factory.getDeployedContract("TvmTvmEventConfiguration", config);

        const details = await contract.methods
          .getDetails({ answerId: 0 })
          .call({ responsible: true });

        if (+details._networkConfiguration.endTimestamp === 0) {
          activeConfigurations.push({
            type: 'timestamp',
            address: config.toString(),
          });
        }
      }
    }
  }

  console.log(activeConfigurations);
};

main().then(() => console.log("Success"));
