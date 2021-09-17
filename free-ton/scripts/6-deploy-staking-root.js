const logger = require("mocha-logger");
const fs = require("fs");

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const DEV_WAIT = 30000;

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

  const true_admin = config._admin;
  const true_dao = config._dao_root;

  config._admin = admin.address;
  config._dao_root = admin.address;
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
  logger.log(`Set true admin`);
  await admin.runTarget({
    contract: stakingRoot,
    method: 'setAdmin',
    params: {new_admin: true_admin, send_gas_to: admin.address},
  });
  // relay lock time - 1 hour
  // relay initial deposit - 5 tokens
  // relay lock time - 3 hours
  // election time - 20 min
  // time before election - 30 min
  // relays count - 100
  // min relays count - 3
  //
  logger.log(`Set relay config`);
  await admin.runTarget({
    contract: stakingRoot,
    method: 'setRelayConfig',
    params: {
      new_relay_config: {
        relayLockTime: 3600 * 3,
        relayRoundTime: 3600,
        electionTime: 20 * 60,
        timeBeforeElection: 30 * 60,
        relaysCount: 100,
        minRelaysCount: 3,
        minRelayDeposit: 5000000000,
        relayInitialDeposit: 10000000000,
      },
      send_gas_to: admin.address
    },
  });

  logger.log(`Set true dao`);
  await admin.runTarget({
    contract: stakingRoot,
    method: 'setDaoRoot',
    params: {new_dao_root: true_dao, send_gas_to: admin.address},
  });

  if (locklift.network === 'dev') {
    await wait(DEV_WAIT);
  }

  const details = await stakingRoot.call({method: 'getDetails'});
  console.log(details);

}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
