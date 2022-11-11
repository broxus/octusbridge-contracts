export {};

async function main() {
  const TokenTransferEthereumEverscaleEvent =
    await locklift.factory.getContractArtifacts(
      "TokenTransferEthereumEverscaleEvent"
    );
  console.log("TokenTransferEthereumEverscaleEvent");
  console.log("");
  console.log(TokenTransferEthereumEverscaleEvent.code);
  console.log("");

  const TokenTransferEverscaleEthereumEvent =
    await locklift.factory.getContractArtifacts(
      "TokenTransferEverscaleEthereumEvent"
    );
  console.log("TokenTransferEverscaleEthereumEvent");
  console.log("");
  console.log(TokenTransferEverscaleEthereumEvent.code);
  console.log("");

  const DaoEthereumActionEvent = await locklift.factory.getContractArtifacts(
    "DaoEthereumActionEvent"
  );
  console.log("DaoEthereumActionEvent");
  console.log("");
  console.log(DaoEthereumActionEvent.code);
  console.log("");

  const StakingEthereumEverscaleEvent =
    await locklift.factory.getContractArtifacts(
      "StakingEthereumEverscaleEvent"
    );
  console.log("StakingEthereumEverscaleEvent");
  console.log("");
  console.log(StakingEthereumEverscaleEvent.code);
  console.log("");

  const StakingEverscaleEthereumEvent =
    await locklift.factory.getContractArtifacts(
      "StakingEverscaleEthereumEvent"
    );
  console.log("StakingEverscaleEthereumEvent");
  console.log("");
  console.log(StakingEverscaleEthereumEvent.code);
  console.log("");

  const StakingEverscaleSolanaEvent =
    await locklift.factory.getContractArtifacts("StakingEverscaleSolanaEvent");
  console.log("StakingEverscaleSolanaEvent");
  console.log("");
  console.log(StakingEverscaleSolanaEvent.code);
  console.log("");

  const TokenTransferEverscaleSolanaEvent =
    await locklift.factory.getContractArtifacts(
      "TokenTransferEverscaleSolanaEvent"
    );
  console.log("TokenTransferEverscaleSolanaEvent");
  console.log("");
  console.log(TokenTransferEverscaleSolanaEvent.code);
  console.log("");

  const TokenTransferSolanaEverscaleEvent =
    await locklift.factory.getContractArtifacts(
      "TokenTransferSolanaEverscaleEvent"
    );
  console.log("TokenTransferSolanaEverscaleEvent");
  console.log("");
  console.log(TokenTransferSolanaEverscaleEvent.code);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
