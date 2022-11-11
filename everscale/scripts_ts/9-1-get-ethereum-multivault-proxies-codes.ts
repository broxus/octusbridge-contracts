export {};

const main = async () => {
  const ProxyMultiVaultEthereumNative =
    await locklift.factory.getContractArtifacts(
      "ProxyMultiVaultEthereumNative"
    );
  console.log("ProxyMultiVaultEthereumNative");
  console.log(ProxyMultiVaultEthereumNative.code);
  console.log("");

  const ProxyMultiVaultEthereumAlien =
    await locklift.factory.getContractArtifacts("ProxyMultiVaultEthereumAlien");
  console.log("ProxyMultiVaultEthereumAlien");
  console.log(ProxyMultiVaultEthereumAlien.code);
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
