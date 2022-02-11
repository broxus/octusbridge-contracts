const {convertCrystal} = require("locklift/locklift/utils");
const prompts = require('prompts');
const ora = require('ora');
const {
  logContract,
  isValidTonAddress,
  wait_acc_deployed,
  deployAccount
} = require('./../test/utils');


const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
// Due to the network lag, graphql may not catch wallets updates instantly
const afterRun = async (tx) => {
  if (locklift.network === 'dev' || locklift.network === 'prod') {
    await wait(30000);
  }
  await wait(1000);
};

const getRandomNonce = () => Math.ceil(Math.random() * 64000);


async function main() {
  // bright
  console.log('\x1b[1m', '\n\nSetting staking deployment params:')
  const deploy_params = await prompts([
    {
      type: 'text',
      name: 'tokenRoot',
      message: 'Bridge token root',
      validate: value => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'daoRoot',
      message: 'Dao root',
      validate: value => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'admin',
      message: 'Staking admin (can upgrade contracts code, set event config addresses, pause staking)',
      validate: value => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'rescuer',
      message: 'Staking rescuer (can set emergency and withdraw tons/bridges)',
      initial: prev => prev,
      validate: value => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'rewarder',
      initial: prev => prev,
      message: 'Staking rewarder (can start new reward round)',
      validate: value => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'ethTonEventConfig',
      initial: '0:0000000000000000000000000000000000000000000000000000000000000001',
      message: 'Eth->Ton event configuration (broadcast relay verify event from ethereum). Could be omitted',
      validate: value => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'tonEthEventConfig',
      initial: '0:0000000000000000000000000000000000000000000000000000000000000001',
      message: 'Ton->Eth event configuration (broadcast RelayRoundCreation event with eth keys from staking). Could be omitted',
      validate: value => isValidTonAddress(value) ? true : 'Invalid address'
    }
  ]);
  console.log('\x1b[1m', '\n\nNow setting relay configs:')
  const relay_config = await prompts([
    {
      type: 'number',
      name: 'relayLockTime',
      initial: 5184000,
      message: 'Relay deposit lock (in seconds)'
    },
    {
      type: 'number',
      name: 'relayRoundTime',
      initial: 604800,
      message: 'Relay round time (in seconds)'
    },
    {
      type: 'number',
      name: 'electionTime',
      message: 'Election time (in seconds)',
      initial: 172800
    },
    {
      type: 'number',
      name: 'timeBeforeElection',
      message: 'Time before the election after round starts (in seconds)',
      initial: 345600
    },
    {
      type: 'number',
      name: 'minRoundGapTime',
      message: 'Min delta between next round start and current election end (in seconds)',
      initial: 3600
    },
    {
      type: 'number',
      name: 'relaysCount',
      message: 'Relays count',
      initial: 100
    },
    {
      type: 'number',
      name: 'minRelaysCount',
      message: 'Min relays count',
      initial: 14
    },
    {
      type: 'number',
      name: 'minRelayDeposit',
      message: 'Min bridge tokens relay deposit (with decimals)',
      initial: 100000000000000
    },
    {
      type: 'number',
      name: 'relayInitialTonDeposit',
      message: 'Relay initial ton deposit (with decimals)',
      initial: 1500000000000
    },
    {
      type: 'number',
      name: 'relayRewardPerSecond',
      message: 'Shares amount accumulated by relays every second',
      initial: 1000000000
    },
    {
      type: 'number',
      name: 'userRewardPerSecond',
      message: 'Shares amount accumulated by common stakers every second',
      initial: 1000000000
    }
  ]);
  console.log('\x1b[1m', '\nSetup complete! ✔\n')

  const [keyPair] = await locklift.keys.getKeyPairs();

  const spinner = ora('Deploying staking deployer...').start();

  const stakingRoot = await locklift.factory.getContract('Staking');
  const StakingRootDeployer = await locklift.factory.getContract('StakingRootDeployer');
  const stakingRootDeployer = await locklift.giver.deployContract({
    contract: StakingRootDeployer,
    constructorParams: {},
    initParams: {nonce: getRandomNonce(), stakingCode: stakingRoot.code},
    keyPair: keyPair,
  }, locklift.utils.convertCrystal(50, 'nano'));
  await wait_acc_deployed(stakingRootDeployer.address);
  spinner.succeed(`Staking deployer address: ${stakingRootDeployer.address}`);

  spinner.start('Deploying temporary dao/admin for initial setup...');
  const admin = await deployAccount(keyPair, 150);
  admin.afterRun = afterRun;
  await wait_acc_deployed(admin.address);
  spinner.succeed(`Temporary admin/dao address: ${admin.address}`);

  spinner.start('Deploy staking...');
  stakingRoot.setAddress((await stakingRootDeployer.run({
    method: 'deploy',
    params: {
      _admin: admin.address,
      _dao_root: admin.address,
      _rewarder: deploy_params.rewarder,
      _rescuer: deploy_params.rescuer,
      _bridge_event_config_eth_ton: deploy_params.ethTonEventConfig,
      _bridge_event_config_ton_eth: deploy_params.tonEthEventConfig,
      _tokenRoot: deploy_params.tokenRoot,
      _deploy_nonce: getRandomNonce()
    }
  })).decoded.output.value0);
  await wait_acc_deployed(stakingRoot.address);
  spinner.succeed(`StakingRoot address: ${stakingRoot.address}`);

  const UserData = await locklift.factory.getContract('UserData');
  const Election = await locklift.factory.getContract('Election');
  const RelayRound = await locklift.factory.getContract('RelayRound');
  const Platform = await locklift.factory.getContract('Platform');

  spinner.start('Installing dependant contracts code...')
  await admin.runTarget({
    contract: stakingRoot,
    method: 'installPlatformOnce',
    params: {code: Platform.code, send_gas_to: admin.address},
    value: convertCrystal(15, 'nano')
  });
  await admin.runTarget({
    contract: stakingRoot,
    method: 'installOrUpdateUserDataCode',
    params: {code: UserData.code, send_gas_to: admin.address},
    value: convertCrystal(15, 'nano')
  });
  await admin.runTarget({
    contract: stakingRoot,
    method: 'installOrUpdateElectionCode',
    params: {code: Election.code, send_gas_to: admin.address},
    value: convertCrystal(15, 'nano')
  });
  await admin.runTarget({
    contract: stakingRoot,
    method: 'installOrUpdateRelayRoundCode',
    params: {code: RelayRound.code, send_gas_to: admin.address},
    value: convertCrystal(15, 'nano')
  });
  spinner.succeed('Dependant contracts code installed ✔');

  spinner.start('Setting relay config...');
  await admin.runTarget({
    contract: stakingRoot,
    method: 'setRelayConfig',
    params: {
      new_relay_config: relay_config,
      send_gas_to: admin.address
    },
    value: convertCrystal(15, 'nano')
  });
  spinner.succeed('Relay config set ✔');

  spinner.start('Setting active flag to true...');
  await admin.runTarget({
    contract: stakingRoot,
    method: 'setActive',
    params: {new_active: true, send_gas_to: admin.address},
    value: convertCrystal(15, 'nano')
  });
  spinner.succeed('Active flag set ✔');

  spinner.start('Setting real admin...');
  await admin.runTarget({
    contract: stakingRoot,
    method: 'setAdmin',
    params: {new_admin: deploy_params.admin, send_gas_to: admin.address},
    value: convertCrystal(15, 'nano')
  });
  spinner.succeed('Real admin set ✔');

  spinner.start('Setting real DAO...');
  await admin.runTarget({
    contract: stakingRoot,
    method: 'setDaoRoot',
    params: {new_dao_root: deploy_params.daoRoot, send_gas_to: admin.address},
    value: convertCrystal(15, 'nano')
  });
  spinner.succeed('Real DAO set ✔');

  spinner.start('Sending remaining evers from temporary admin to staking...');
  await admin.run({
    method: 'sendTransaction',
    params: {
      dest: stakingRoot.address,
      value: 0,
      bounce: false,
      flags: 128,
      payload: ''
    },
    keyPair: keyPair
  });
  spinner.succeed('Remaining evers sent ✔');
  await logContract(stakingRoot);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
