async function main() {
  const Account = await locklift.factory.getAccount('Wallet');
  const [keyPair] = await locklift.keys.getKeyPairs();

  let account = await locklift.giver.deployContract({
    contract: Account,
    constructorParams: {},
    initParams: {
      _randomNonce: Math.random() * 6400 | 0,
    },
    keyPair
  }, locklift.utils.convertCrystal(10, 'nano'));
  const StakingRoot = await locklift.factory.getContract('Staking');
  const Platform = await locklift.factory.getContract('Platform');

  const stakingRoot = await locklift.giver.deployContract({
    contract: StakingRoot,
    constructorParams: {
      _owner: account.address,
      _tokenRoot: locklift.ton.zero_address
    },
    initParams: {
      _randomNonce: Math.random() * 64000 | 0,
    },
    keyPair,
  }, locklift.utils.convertCrystal(10, 'nano'));
  console.log(`StakingRoot address: ${stakingRoot.address}`);
  await account.runTarget({
    method: 'installPlatformOnce',
    params: {code: Platform.code, send_gas_to: account.address},
    keyPair
  })

}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
