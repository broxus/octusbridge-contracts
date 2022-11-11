export {};

const main = async () => {
  const MultiVaultEVMEverscaleEventNative =
    await locklift.factory.getContractArtifacts(
      "MultiVaultEVMEverscaleEventNative"
    );
  const MultiVaultEverscaleEVMEventNative =
    await locklift.factory.getContractArtifacts(
      "MultiVaultEverscaleEVMEventNative"
    );

  const MultiVaultEVMEverscaleEventAlien =
    await locklift.factory.getContractArtifacts(
      "MultiVaultEVMEverscaleEventAlien"
    );
  const MultiVaultEverscaleEVMEventAlien =
    await locklift.factory.getContractArtifacts(
      "MultiVaultEverscaleEVMEventAlien"
    );

  for (const event of [
    MultiVaultEVMEverscaleEventNative,
    MultiVaultEverscaleEVMEventNative,
    MultiVaultEVMEverscaleEventAlien,
    MultiVaultEverscaleEVMEventAlien,
  ]) {
    console.log(event.code);
    console.log("");
  }
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
