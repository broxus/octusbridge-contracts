export {};
const prompts = require('prompts');
const ora = require('ora');
const {
  logContract,
  isValidTonAddress,
  deployAccount
} = require('./../test_ts/utils');

async function main() {
  // bright
  console.log('\x1b[1m', '\n\nSetting staking deployment params:')
  const deploy_params = await prompts([
    {
      type: 'text',
      name: 'tokenRoot',
      message: 'Bridge token root',
      validate: (value: any) => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'daoRoot',
      message: 'Dao root',
      validate: (value: any) => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'admin',
      message: 'Staking admin (can upgrade contracts code, set event config addresses, pause staking)',
      validate: (value: any) => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'rescuer',
      message: 'Staking rescuer (can set emergency and withdraw evers/bridges)',
      initial: (prev: any) => prev,
      validate: (value: any) => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'rewarder',
      initial: (prev: any)  => prev,
      message: 'Staking rewarder (can start new reward round)',
      validate: (value: any) => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'ethTonEventConfig',
      initial: '0:0000000000000000000000000000000000000000000000000000000000000001',
      message: 'Eth->Ever event configuration (broadcast relay verify event from ethereum). Could be omitted',
      validate: (value: any) => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'tonEthEventConfig',
      initial: '0:0000000000000000000000000000000000000000000000000000000000000001',
      message: 'Ever->Eth event configuration (broadcast RelayRoundCreation event with eth keys from staking). Could be omitted',
      validate: (value: any) => isValidTonAddress(value) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'tonSolEventConfig',
      initial: '0:0000000000000000000000000000000000000000000000000000000000000001',
      message: 'Ever->Sol event configuration (broadcast RelayRoundCreation event with ton keys from staking). Could be omitted',
      validate: (value: any) => isValidTonAddress(value) ? true : 'Invalid address'
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
      message: 'Relay initial ever deposit (with decimals)',
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

  const signer = (await locklift.keystore.getSigner("0"))!;

  const spinner = ora('Deploying staking deployer...').start();

  const stakingRootData = await locklift.factory.getContractArtifacts('StakingV1_2');
  const {contract: stakingRootDeployer}  = await locklift.transactions.waitFinalized(locklift.factory.deployContract({
    contract: 'StakingRootDeployer',
    constructorParams: {},
    initParams: {nonce: locklift.utils.getRandomNonce(), stakingCode: stakingRootData.code},
    publicKey: signer.publicKey,
    value: locklift.utils.toNano(30)
  }));

  spinner.succeed(`Staking deployer address: ${stakingRootDeployer.address}`);

  spinner.start('Deploying temporary dao/admin for initial setup...');

  const admin = await deployAccount(signer, 100);

  spinner.succeed(`Temporary admin/dao address: ${admin.address}`);

  spinner.start('Deploy staking...');
  const address = await stakingRootDeployer.methods.deploy({
    _admin: admin.address,
    _dao_root: admin.address,
    _rewarder: deploy_params.rewarder,
    _rescuer: deploy_params.rescuer,
    _bridge_event_config_eth_ton: deploy_params.ethTonEventConfig,
    _bridge_event_config_ton_eth: deploy_params.tonEthEventConfig,
    _bridge_event_config_ton_sol: deploy_params.tonSolEventConfig,
    _tokenRoot: deploy_params.tokenRoot,
    _deploy_nonce: locklift.utils.getRandomNonce()
  }).sendExternal({
    publicKey: admin.address,
  });

  if(!address.output?.value0) {
    throw new Error('address not found')
  }
  const stakingRoot = await locklift.factory.getDeployedContract('StakingV1_2', address.output.value0);

  spinner.succeed(`StakingRoot address: ${stakingRoot.address}`);

  const UserData = await locklift.factory.getContractArtifacts('UserData');
  const Election = await locklift.factory.getContractArtifacts('Election');
  const RelayRound = await locklift.factory.getContractArtifacts('RelayRound');
  const Platform = await locklift.factory.getContractArtifacts('Platform');

  spinner.start('Installing dependant contracts code...')
  await stakingRoot.methods.installPlatformOnce({code: Platform.code, send_gas_to: admin.address}).send({
    from: admin.address,
    amount: locklift.utils.toNano(15),
  });
  await stakingRoot.methods.installOrUpdateUserDataCode({code: UserData.code, send_gas_to: admin.address}).send({
    from: admin.address,
    amount: locklift.utils.toNano(15),
  });
  await stakingRoot.methods.installOrUpdateElectionCode({code: Election.code, send_gas_to: admin.address}).send({
    from: admin.address,
    amount: locklift.utils.toNano(15),
  });
  await stakingRoot.methods.installOrUpdateRelayRoundCode({code: RelayRound.code, send_gas_to: admin.address}).send({
    from: admin.address,
    amount: locklift.utils.toNano(15),
  });
  spinner.succeed('Dependant contracts code installed ✔');

  spinner.start('Setting relay config...');
  await stakingRoot.methods.setRelayConfig({
    new_relay_config: relay_config,
    send_gas_to: admin.address
  }).send({
    from: admin.address,
    amount: locklift.utils.toNano(15),
  });
  spinner.succeed('Relay config set ✔');

  spinner.start('Setting active flag to true...');
  await stakingRoot.methods.setActive({new_active: true, send_gas_to: admin.address}).send({
    from: admin.address,
    amount: locklift.utils.toNano(15),
  });
  spinner.succeed('Active flag set ✔');

  spinner.start('Setting real admin...');
  await stakingRoot.methods.setAdmin({new_admin: deploy_params.admin, send_gas_to: admin.address}).send({
    from: admin.address,
    amount: locklift.utils.toNano(15),
  });
  spinner.succeed('Real admin set ✔');

  spinner.start('Setting real DAO...');
  await stakingRoot.methods.setDaoRoot({new_dao_root: deploy_params.daoRoot, send_gas_to: admin.address}).send({
    from: admin.address,
    amount: locklift.utils.toNano(15),
  });
  spinner.succeed('Real DAO set ✔');

  spinner.start('Sending remaining evers from temporary admin to staking...');

  const adminContract = await locklift.factory.getDeployedContract('Wallet', admin.address);

  await adminContract.methods.sendTransaction({
    dest: stakingRoot.address,
    value: 0,
    bounce: false,
    flags: 128,
    payload: ''
  }).sendExternal({
    publicKey: admin.address,
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
