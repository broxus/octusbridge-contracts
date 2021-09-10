const logger = require("mocha-logger");
const fs = require("fs");

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const DEV_WAIT = 60000;

const getRandomNonce = () => Math.ceil(Math.random() * 64000);

const config = JSON.parse(fs.readFileSync("scripts/staking_deploy_config.json"));

const deployAccount = async function (key) {
  const user_bal = 15;

  const Account = await locklift.factory.getAccount('Wallet');
  let account = await locklift.giver.deployContract({
    contract: Account,
    constructorParams: {},
    initParams: {
      _randomNonce: Math.random() * 6400 | 0,
    },
    keyPair: key
  }, locklift.utils.convertCrystal(user_bal, 'nano'));
  account.setKeyPair(key);
  return account;
}

async function main() {
  const [keyPair] = await locklift.keys.getKeyPairs();

  const admin = await deployAccount(keyPair);
  logger.log(`Deploy admin acc - ${admin.address} with key`);
  logger.log('Secret', keyPair.secret, 'public', keyPair.public);

  const StakingRootDeployer = await locklift.factory.getContract('StakingRootDeployer');
  const stakingRootDeployer = await locklift.giver.deployContract({
    contract: StakingRootDeployer,
    constructorParams: {},
    initParams: {nonce: getRandomNonce()},
    keyPair: keyPair,
  }, locklift.utils.convertCrystal(10, 'nano'));
  if (locklift.network === 'dev') {
    await wait(DEV_WAIT);
  }
  logger.log(`Deploying stakingRoot`);
  stakingRoot = await locklift.factory.getContract('Staking');

  logger.log(`Deploying staking with next params:`)
  console.dir(config, {depth: null, colors: true});

  config.stakingCode = stakingRoot.code;
  config._deploy_nonce = getRandomNonce();

  stakingRoot.setAddress((await stakingRootDeployer.run({
    method: 'deploy',
    params: config
  })).decoded.output.value0);
  logger.log(`StakingRoot address: ${stakingRoot.address}`);

  const UserData = await locklift.factory.getContract('UserData');
  const Election = await locklift.factory.getContract('Election');
  const RelayRound = await locklift.factory.getContract('RelayRound');
  const Platform = await locklift.factory.getContract('Platform');

  logger.log(`Installing Platform code`);
  await admin.runTarget({
    contract: stakingRoot,
    method: 'installPlatformOnce',
    params: {code: Platform.code, send_gas_to: admin.address},
  });
  logger.log(`Installing UserData code`);
  await admin.runTarget({
    contract: stakingRoot,
    method: 'installOrUpdateUserDataCode',
    params: {code: UserData.code, send_gas_to: admin.address},
  });
  logger.log(`Installing ElectionCode code`);
  await admin.runTarget({
    contract: stakingRoot,
    method: 'installOrUpdateElectionCode',
    params: {code: Election.code, send_gas_to: admin.address},
  });
  logger.log(`Installing RelayRoundCode code`);
  await admin.runTarget({
    contract: stakingRoot,
    method: 'installOrUpdateRelayRoundCode',
    params: {code: RelayRound.code, send_gas_to: admin.address},
  });
  logger.log(`Set staking to Active`);
  await admin.runTarget({
    contract: stakingRoot,
    method: 'setActive',
    params: {new_active: true, send_gas_to: admin.address},
  });

}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
