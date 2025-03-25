const main = async () => {
  const signer = (await locklift.keystore.getSigner("0"))!;

  await locklift.deployments.deploy({
    deploymentName: 'TransactionChecker',
    deployConfig: {
      contract: 'TrustlessVerifierMockup',
      constructorParams: {},
      initParams: { _randomNonce: locklift.utils.getRandomNonce() },
      publicKey: signer.publicKey,
      value: locklift.utils.toNano(5),
    },
    enableLogs: true,
  });
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
