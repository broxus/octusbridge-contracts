export {};

const main = async () => {
  const ProxyMultiVaultSolanaNative =
    await locklift.factory.getContractArtifacts("ProxyMultiVaultSolanaNative");
  console.log("ProxyMultiVaultSolanaNative");
  console.log(ProxyMultiVaultSolanaNative.code);
  console.log("");
  const ProxyMultiVaultSolanaAlien =
    await locklift.factory.getContractArtifacts("ProxyMultiVaultSolanaAlien");
  console.log("ProxyMultiVaultSolanaAlien");
  console.log(ProxyMultiVaultSolanaAlien.code);
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
