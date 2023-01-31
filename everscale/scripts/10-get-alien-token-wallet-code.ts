export {};

const main = async () => {
  const AlienTokenWalletUpgradeable =
    await locklift.factory.getContractArtifacts("AlienTokenWalletUpgradeable");

  console.log(AlienTokenWalletUpgradeable.code);
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
