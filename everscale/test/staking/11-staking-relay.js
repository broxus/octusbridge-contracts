const {
    expect, sleep, deployAccount, deployTokenRoot, mintTokens, depositTokens
} = require('../utils');
const BigNumber = require('bignumber.js');
const logger = require('mocha-logger');
const {
    convertCrystal
} = locklift.utils;

const TOKEN_PATH = '../node_modules/ton-eth-bridge-token-contracts/build';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const user1_eth_addr = '0x93E05804b0A58668531F65A93AbfA1aD8F7F5B2b';
const user2_eth_addr = '0x197216E3421D13A72Fdd79A44d8d89f121dcab6C';
const user3_eth_addr = '0xaF2AAf6316a137bbD7D4a9d3279D06E80EE79423';

let stakingRoot;
let stakingToken;
let stakingWallet;

let encoder;

let user1;
let user1Data;
let user2;
let user2Data;
let user3;
let user3Data;
let stakingOwner;
let userTokenWallet1;
let userTokenWallet2;
let userTokenWallet3;
let ownerWallet;
let userInitialTokenBal = 100000;
let rewardTokensBal = 10000;
let userDeposit = 100;
let rewardPerSec = 1000000;

const DEV_WAIT = 100000;

const MIN_RELAY_DEPOSIT = 1;
const RELAY_ROUND_TIME_1 = 10;
const ELECTION_TIME = 4;
const TIME_BEFORE_ELECTION = 5;
const MIN_GAP_TIME = 1;
const RELAYS_COUNT_1 = 3;
const MIN_RELAYS = 2;
const RELAY_INITIAL_DEPOSIT = 500;


describe('Test Staking Relay mechanic', async function () {
    this.timeout(10000000);

    const sendTons = async function (from, receiver) {
        return await from.runTarget({
            contract: receiver,
            value: convertCrystal(25, 'nano')
        });
    }

    const userRewardRounds = async function (userData) {
        const details = await userData.call({method: 'getDetails'});
        return details.rewardRounds;
    }

    const userTokenBalance = async function (userData) {
        const details = await userData.call({method: 'getDetails'});
        return details.token_balance;
    }

    const checkTokenBalances = async function(userTokenWallet, userAccount, pool_wallet_bal, pool_bal, pool_reward_bal, user_bal, user_data_bal) {
        const staking_details = await stakingRoot.call({method: 'getDetails'});

        const _pool_wallet_bal = await stakingWallet.call({method: 'balance'});
        const _pool_bal = staking_details.tokenBalance;
        const _pool_reward_bal = staking_details.rewardTokenBalance;

        const _user_bal = await userTokenWallet.call({method: 'balance'});
        const user_data = await userAccount.call({method: 'getDetails'});
        const _user_data_bal = user_data.token_balance;

        // console.log(_pool_wallet_bal.toString(), _pool_bal.toString(), _pool_reward_bal.toString(), _user_bal.toString(), _user_data_bal.toString());

        expect(_pool_wallet_bal.toNumber()).to.be.equal(pool_wallet_bal, 'Pool wallet balance bad');
        expect(_pool_bal.toNumber()).to.be.equal(pool_bal, 'Pool balance bad');
        expect(_pool_reward_bal.toNumber()).to.be.equal(pool_reward_bal, 'Pool reward balance bad');
        expect(_user_bal.toNumber()).to.be.equal(user_bal, 'User balance bad');
        expect(_user_data_bal.toNumber()).to.be.equal(user_data_bal, 'User data balance bad');
    }

    const startNewRewardRound = async function () {
        return await stakingOwner.runTarget({
            contract: stakingRoot,
            method: 'startNewRewardRound',
            params: {
                send_gas_to: stakingOwner.address,
            },
            value: locklift.utils.convertCrystal(11, 'nano')
        });
    }

    const getRewardForRelayRound = async function(user, userData, round_num) {
        return await userData.run({
            method: 'getRewardForRelayRound',
            params: {round_num: round_num},
            keyPair: user.keyPair
        })
    }

    const getElection = async function (round_num) {
        const addr = await stakingRoot.call({
            method: 'getElectionAddress',
            params: {round_num: round_num}
        });
        const election = await locklift.factory.getContract('Election');
        election.setAddress(addr);
        return election;
    }

    const deployEncoder = async function () {
        const Encoder = await locklift.factory.getContract('Encoder');
        const [keyPair] = await locklift.keys.getKeyPairs();

        return await locklift.giver.deployContract({
            contract: Encoder,
            constructorParams: {},
            initParams: {},
            keyPair
        }, locklift.utils.convertCrystal(1, 'nano'));
    }

    const getRelayRound = async function (round_num) {
        const addr = await stakingRoot.call({
            method: 'getRelayRoundAddress',
            params: {round_num: round_num}
        });
        const round = await locklift.factory.getContract('RelayRound');
        round.setAddress(addr);
        return round;
    }

    const getBalance = async function (address) {
        const res = await locklift.ton.client.net.wait_for_collection({
            collection: 'accounts',
            filter: {
                id: { eq: address }
            },
            result: 'balance',
            timeout: 120000
        });
        return new BigNumber(res.result.balance);
    }

    const requestRelayMembership = async function (_user, _userData) {
        return await _userData.run({
            method: 'becomeRelayNextRound',
            params: {},
            keyPair: _user.keyPair
        })
    }

    const startElection = async function(_user) {
        return await stakingRoot.run({
            method: 'startElectionOnNewRound',
            params: {},
            keyPair: _user.keyPair
        })
    }

    const endElection = async function (_user) {
        return await stakingRoot.run({
            method: 'endElection',
            params: {},
            keyPair: _user.keyPair
        })
    }

    const slashUser = async function (_user) {
        return await stakingOwner.runTarget({
            contract: stakingRoot,
            method: 'slashRelay',
            params: {
                relay_staker_addr: _user.address,
                send_gas_to: stakingOwner.address
            },
            value: convertCrystal(11, "nano")
        })
    }

    const setEmergency = async function () {
        return await stakingOwner.runTarget({
            contract: stakingRoot,
            method: 'setEmergency',
            params: {_emergency: true, send_gas_to: stakingOwner.address},
            value: convertCrystal(11, 'nano')
        });
    }

    const withdrawTokens = async function(user, withdraw_amount) {
        return await user.runTarget({
            contract: stakingRoot,
            method: 'withdraw',
            params: {
                amount: withdraw_amount,
                send_gas_to: user.address
            },
            value: convertCrystal(11, 'nano')
        });
    };

    const withdrawEmergency = async function(amount, all) {
        return await stakingOwner.runTarget({
            contract: stakingRoot,
            method: 'withdrawTokensEmergency',
            params: {
                amount: amount,
                receiver: stakingOwner.address,
                all: all,
                send_gas_to: stakingOwner.address
            },
            value: convertCrystal(11, 'nano')
        });
    }

    const confirmTonRelayAccount = async function (_user, _userData) {
        return await _userData.run({
            method: 'confirmTonAccount',
            params: {},
            keyPair: _user.keyPair
        })
    }

    const confirmEthRelayAccount = async function (_user, _user_eth_addr) {
        const event_data = await encoder.call({
            method: 'encodeEthereumEverscaleStakingEventData',
            params: {
                eth_addr: _user_eth_addr,
                wk_id: 0,
                ton_addr_body: (new BigNumber(`0x${_user.address.slice(2)}`)).toFixed(0)
            }
        })
        return await stakingOwner.runTarget({
            contract: stakingRoot,
            method: 'onEventConfirmed',
            params: {
                eventData: {
                    voteData: {
                        eventTransaction: 0,
                        eventIndex: 0,
                        eventData: event_data,
                        eventBlockNumber: 0,
                        eventBlock: 0
                    },
                    configuration: _user.address,
                    staking: _user.address,
                    chainId: 0
                },
                'value1': '',
                gasBackAddress: stakingOwner.address
            },
            value: convertCrystal(11, "nano")
        })
    }

    const linkRelayAccounts = async function (_user, ton_pk, eth_addr) {
        const user_pk = new BigNumber(ton_pk, 16);
        const user_eth = new BigNumber(eth_addr.toLowerCase(), 16);

        const input_params = {
            ton_pubkey: user_pk.toFixed(),
            eth_address: user_eth.toFixed()
        }

        return await _user.runTarget({
            contract: stakingRoot,
            method: 'linkRelayAccounts',
            params: input_params,
            value: convertCrystal(RELAY_INITIAL_DEPOSIT + 1, "nano")
        })
    }

    const getUserDataAccount = async function (_user) {
        const userData = await locklift.factory.getContract('UserData');
        userData.setAddress(await stakingRoot.call({
            method: 'getUserDataAddress',
            params: {user: _user.address}
        }));
        return userData
    }

    const waitForDeploy = async function (address) {
        return await getBalance(address);
    }

    describe('Setup contracts', async function() {
        describe('Token', async function() {
            it('Deploy admin', async function() {
                let keys = await locklift.keys.getKeyPairs();
                stakingOwner = await deployAccount(keys[3], RELAY_INITIAL_DEPOSIT + 100);
            });

            it('Deploy root', async function() {
                stakingToken = await deployTokenRoot('Farm token', 'FT', stakingOwner);
            });

        });

        describe('Users', async function() {
            it('Deploy users accounts', async function() {
                let users = [];
                let keys = await locklift.keys.getKeyPairs();
                for (const i of [0, 1, 2]) {
                    const keyPair = keys[i];
                    const account = await deployAccount(keyPair, RELAY_INITIAL_DEPOSIT + 50);
                    logger.log(`User address: ${account.address}`);

                    const {
                        acc_type_name
                    } = await locklift.ton.getAccountType(account.address);

                    expect(acc_type_name).to.be.equal('Active', 'User account not active');
                    users.push(account);
                }
                [user1, user2, user3] = users;
            });

            it('Deploy users token wallets + mint', async function() {
                [ userTokenWallet1, userTokenWallet2, userTokenWallet3, ownerWallet ] = await mintTokens(stakingOwner, [user1, user2, user3, stakingOwner], stakingToken, userInitialTokenBal);

                const balance1 = await userTokenWallet1.call({method: 'balance'});
                const balance2 = await userTokenWallet2.call({method: 'balance'});
                const balance3 = await userTokenWallet3.call({method: 'balance'});
                const balance4 = await ownerWallet.call({method: 'balance'});

                expect(balance1.toNumber()).to.be.equal(userInitialTokenBal, 'User ton token wallet empty');
                expect(balance2.toNumber()).to.be.equal(userInitialTokenBal, 'User ton token wallet empty');
                expect(balance3.toNumber()).to.be.equal(userInitialTokenBal, 'User ton token wallet empty');
                expect(balance4.toNumber()).to.be.equal(userInitialTokenBal, 'User ton token wallet empty');
            });
        });

        describe('Staking', async function() {
            it('Deploy encoder', async function() {
                encoder = await deployEncoder();
            })

            it('Deploy staking', async function () {
                const [keyPair, keyPair1] = await locklift.keys.getKeyPairs();

                const TonConfigMockup = await locklift.factory.getContract('TonConfigMockup');
                const ton_config_mockup = await locklift.giver.deployContract({
                    contract: TonConfigMockup,
                    constructorParams: {},
                    initParams: {nonce: locklift.utils.getRandomNonce()},
                    keyPair: keyPair
                }, locklift.utils.convertCrystal(1, 'nano'));

                const SolConfigMockup = await locklift.factory.getContract('SolConfigMockup');
                const sol_config_mockup = await locklift.giver.deployContract({
                    contract: SolConfigMockup,
                    constructorParams: {},
                    initParams: {nonce: locklift.utils.getRandomNonce()},
                    keyPair: keyPair
                }, locklift.utils.convertCrystal(1, 'nano'));

                stakingRoot = await locklift.factory.getContract('StakingV1_2');
                const StakingRootDeployer = await locklift.factory.getContract('StakingRootDeployer');
                const stakingRootDeployer = await locklift.giver.deployContract({
                    contract: StakingRootDeployer,
                    constructorParams: {},
                    initParams: {nonce: locklift.utils.getRandomNonce(), stakingCode: stakingRoot.code},
                    keyPair: keyPair,
                }, locklift.utils.convertCrystal(50, 'nano'));

                logger.log(`Deploying stakingRoot`);
                stakingRoot.setAddress((await stakingRootDeployer.run({
                    method: 'deploy',
                    params: {
                        _admin: stakingOwner.address,
                        _tokenRoot: stakingToken.address,
                        _dao_root: stakingOwner.address,
                        _rewarder: stakingOwner.address,
                        _rescuer: stakingOwner.address,
                        _bridge_event_config_eth_ton: stakingOwner.address,
                        _bridge_event_config_ton_eth: ton_config_mockup.address,
                        _bridge_event_config_ton_sol: sol_config_mockup.address,
                        _deploy_nonce: locklift.utils.getRandomNonce()
                    }
                })).decoded.output.value0);
                logger.log(`StakingRoot address: ${stakingRoot.address}`);
                logger.log(`StakingRoot owner address: ${stakingOwner.address}`);
                logger.log(`StakingRoot token root address: ${stakingToken.address}`);


                const staking_details = await stakingRoot.call({method: 'getDetails'});
                logger.log(`Staking token wallet: ${staking_details.tokenWallet}`);

                stakingWallet = await locklift.factory.getContract('TokenWallet', TOKEN_PATH);
                stakingWallet.setAddress(staking_details.tokenWallet);

                // call in order to check if wallet is deployed
                const owner_address = await stakingWallet.call({method: 'owner'});
                const root_address = await stakingWallet.call({method: 'root'});
                expect(owner_address).to.be.equal(stakingRoot.address, 'Wrong staking token wallet owner');
                expect(root_address).to.be.equal(stakingToken.address, 'Wrong staking token wallet root');
            });

            it('Installing codes', async function() {
                const UserData = await locklift.factory.getContract('UserData');
                const Election = await locklift.factory.getContract('Election');
                const RelayRound = await locklift.factory.getContract('RelayRound');
                const Platform = await locklift.factory.getContract('Platform');

                logger.log(`Installing Platform code`);
                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'installPlatformOnce',
                    params: {code: Platform.code, send_gas_to: stakingOwner.address},
                    value: convertCrystal(11, 'nano')

                });
                logger.log(`Installing UserData code`);
                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'installOrUpdateUserDataCode',
                    params: {code: UserData.code, send_gas_to: stakingOwner.address},
                    value: convertCrystal(11, 'nano')
                });
                logger.log(`Installing ElectionCode code`);
                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'installOrUpdateElectionCode',
                    params: {code: Election.code, send_gas_to: stakingOwner.address},
                    value: convertCrystal(11, 'nano')
                });
                logger.log(`Installing RelayRoundCode code`);
                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'installOrUpdateRelayRoundCode',
                    params: {code: RelayRound.code, send_gas_to: stakingOwner.address},
                    value: convertCrystal(11, 'nano')
                });
                logger.log(`Set staking to Active`);
                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'setActive',
                    params: {new_active: true, send_gas_to: stakingOwner.address},
                    value: convertCrystal(11, 'nano')
                });

                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const active = await stakingRoot.call({method: 'isActive'});
                expect(active).to.be.equal(true, "Staking not active");
            });

            it('Sending reward tokens to staking', async function() {
                const amount = rewardTokensBal;

                await depositTokens(stakingRoot, stakingOwner, ownerWallet, amount, true);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const staking_balance = await stakingWallet.call({method: 'balance'});

                const staking_details = await stakingRoot.call({method: 'getDetails'});
                const staking_balance_stored = staking_details.rewardTokenBalance;

                expect(staking_balance.toString()).to.be.equal(amount.toString(), 'Farm pool balance empty');
                expect(staking_balance_stored.toString()).to.be.equal(amount.toString(), 'Farm pool balance not recognized');
            });

            it("Setting relay config for testing", async function() {
                // super minimal relay config for local testing
                const init_deposit = convertCrystal(RELAY_INITIAL_DEPOSIT, 'nano');

                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'setRelayConfig',
                    params: {
                        new_relay_config: {
                            relayLockTime: 30 * 24 * 60 * 60, // 30 days
                            relayRoundTime: RELAY_ROUND_TIME_1,
                            electionTime: ELECTION_TIME,
                            timeBeforeElection: TIME_BEFORE_ELECTION,
                            relaysCount: RELAYS_COUNT_1,
                            minRelaysCount: MIN_RELAYS,
                            minRoundGapTime: MIN_GAP_TIME,
                            minRelayDeposit: MIN_RELAY_DEPOSIT,
                            relayRewardPerSecond: 1000000,
                            userRewardPerSecond: 1000000,
                            relayInitialTonDeposit: init_deposit.toString(),
                        },
                        send_gas_to: stakingOwner.address
                    },
                    value: convertCrystal(11, 'nano')
                });
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const relay_config = await stakingRoot.call({method: 'getRelayConfig'});
                expect(relay_config.relaysCount.toString()).to.be.equal(RELAYS_COUNT_1.toString(), "Relay config not installed");
            })
        });
    });

    describe('Relay pipeline testing', async function () {
        describe('Standard case', async function() {
            let user1_deposit_time;
            let user2_deposit_time;

            it('Users deposit tokens', async function () {
                const tx = await depositTokens(stakingRoot, user1, userTokenWallet1, userDeposit);
                user1Data = await getUserDataAccount(user1);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                await checkTokenBalances(
                    userTokenWallet1, user1Data, rewardTokensBal + userDeposit,
                    userDeposit, rewardTokensBal, userInitialTokenBal - userDeposit, userDeposit
                );

                const staking_details = await stakingRoot.call({method: 'getDetails'});
                user1_deposit_time = staking_details.lastRewardTime;

                await depositTokens(stakingRoot, user2, userTokenWallet2, userDeposit * 2);
                user2Data = await getUserDataAccount(user2);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                await checkTokenBalances(
                    userTokenWallet2, user2Data, rewardTokensBal + userDeposit * 3,
                    userDeposit * 3, rewardTokensBal, userInitialTokenBal - userDeposit * 2, userDeposit * 2
                );
                const staking_details_1 = await stakingRoot.call({method: 'getDetails'});
                user2_deposit_time = staking_details_1.lastRewardTime;

                await depositTokens(stakingRoot, user3, userTokenWallet3, userDeposit * 3);
                user3Data = await getUserDataAccount(user3);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                await checkTokenBalances(
                    userTokenWallet3, user3Data, rewardTokensBal + userDeposit * 6,
                    userDeposit * 6, rewardTokensBal, userInitialTokenBal - userDeposit * 3, userDeposit * 3
                );
            });

            it("Creating origin relay round", async function () {
                const user1_pk = new BigNumber(user1.keyPair.public, 16);
                const user1_eth = new BigNumber(user1_eth_addr.toLowerCase(), 16);

                const input_params = {
                    staker_addrs: [user1.address],
                    ton_pubkeys: [user1_pk.toFixed()],
                    eth_addrs: [user1_eth.toFixed()],
                    staked_tokens: [1],
                    ton_deposit: convertCrystal(100, 'nano'),
                    send_gas_to: stakingOwner.address
                }


                const staking_details_0 = await stakingRoot.call({method: 'getDetails'});
                const reward_rounds = staking_details_0.rewardRounds;

                const tx = await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'createOriginRelayRound',
                    params: input_params,
                    value: convertCrystal(200, 'nano')
                });
                await wait(500);

                const round = await getRelayRound(0);
                await waitForDeploy(round.address);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const total_tokens_staked = await round.call({method: 'total_tokens_staked'});
                const round_reward = await round.call({method: 'round_reward'});
                const relays_count = await round.call({method: 'relays_count'});
                const reward_round_num = await round.call({method: 'reward_round_num'});

                const _round_reward = RELAY_ROUND_TIME_1 * rewardPerSec;
                expect(total_tokens_staked.toString()).to.be.equal('1', "Bad relay round");
                expect(round_reward.toString()).to.be.equal(_round_reward.toString(), "Bad relay round");
                expect(relays_count.toString()).to.be.equal('1', "Bad relay round");
                expect(reward_round_num.toString()).to.be.equal('0', "Bad relay round");

                const relay_rounds_data = await stakingRoot.call({method: 'getRelayRoundsDetails'});
                expect(relay_rounds_data.currentRelayRound.toString()).to.be.equal('0', "Bad round installed in root");

                const staking_details = await stakingRoot.call({method: 'getDetails'});
                const reward_rounds_new = staking_details.rewardRounds;

                const expected_reward = round_reward.plus(new BigNumber(reward_rounds[0].totalReward));
                expect(expected_reward.toString()).to.be.equal(reward_rounds_new[0].totalReward.toString(), "Bad reward after relay round init");

                const {
                    value: {
                        round_num: _round_num,
                        round_start_time: _round_start_time,
                        round_end_time: _round_end_time,
                        round_addr: _round_addr,
                        relays_count: _relays_count,
                        duplicate: _duplicate
                    }
                } = (await stakingRoot.getEvents('RelayRoundInitialized')).pop();

                expect(_round_num.toString()).to.be.equal('0', "Bad event");
                expect(_round_addr).to.be.equal(round.address, "Bad event");

                expect(_relays_count.toString()).to.be.equal('1', "Relay creation fail - relays count");
                expect(_duplicate).to.be.equal(false, "Relay creation fail - duplicate");

                const relay = await round.call({
                    method: 'getRelayByStakerAddress',
                    params: {_relay_staker_addr: user1.address}
                });

                expect(relay._staker_addr).to.be.equal(user1.address, "Relay creation fail - staker addr");
                expect(relay._ton_key.toString(16)).to.be.equal(user1_pk.toString(16), "Relay creation fail - ton pubkey");
                expect(relay._eth_addr.toString(16)).to.be.equal(user1_eth.toString(16), "Relay creation fail - eth addr");
                expect(relay._staked_tokens.toString()).to.be.equal('1', "Relay creation fail - staked tokens");
            });

            it("Users link relay accounts", async function () {
                // 1st user is relay already
                // await sendTons(stakingOwner, user1Data);

                await linkRelayAccounts(user2, user2.keyPair.public, user2_eth_addr);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const user2_details = await user2Data.call({method: 'getDetails'});
                const user2_pk = user2_details.relay_ton_pubkey;
                const _user2_eth_addr = user2_details.relay_eth_address;

                const user2_pk_expected = new BigNumber(user2.keyPair.public, 16);
                const user2_eth_addr_expected = new BigNumber(user2_eth_addr.toLowerCase(), 16);

                expect(user2_pk_expected.toString(16)).to.be.equal(user2_pk.toString(16), "Bad ton pubkey installed");
                expect(_user2_eth_addr.toString(16)).to.be.equal(user2_eth_addr_expected.toString(16), "Bad eth addr installed");

                await linkRelayAccounts(user3, user3.keyPair.public, user3_eth_addr);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const user3_details = await user3Data.call({method: 'getDetails'});
                const user3_pk = user3_details.relay_ton_pubkey;
                const _user3_eth_addr = user3_details.relay_eth_address;

                const user3_pk_expected = new BigNumber(user3.keyPair.public, 16);
                const user3_eth_addr_expected = new BigNumber(user3_eth_addr.toLowerCase(), 16);

                expect(user3_pk_expected.toString(16)).to.be.equal(user3_pk.toString(16), "Bad ton pubkey installed");
                expect(_user3_eth_addr.toString(16)).to.be.equal(user3_eth_addr_expected.toString(16), "Bad eth addr installed");
            });

            it("Users confirm ton relay accounts", async function () {
                const bal2 = await getBalance(user2Data.address);
                const bal3 = await getBalance(user3Data.address);

                await confirmTonRelayAccount(user2, user2Data);
                await confirmTonRelayAccount(user3, user3Data);

                const bal2_after = await getBalance(user2Data.address);
                const bal3_after = await getBalance(user3Data.address);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }


                const user1_details = await user1Data.call({method: 'getDetails'});
                const confirmed_user1 = user1_details.ton_pubkey_confirmed;
                expect(confirmed_user1).to.be.equal(true, "Ton pubkey user1 not confirmed");

                const user2_details = await user2Data.call({method: 'getDetails'});
                const confirmed_user2 = user2_details.ton_pubkey_confirmed;
                expect(confirmed_user2).to.be.equal(true, "Ton pubkey user2 not confirmed");
                expect(bal2_after.toNumber()).to.be.gte(bal2.minus(10**9).toNumber(), "Bad gas")

                const user3_details = await user3Data.call({method: 'getDetails'});
                const confirmed_user3 = user3_details.ton_pubkey_confirmed;
                expect(confirmed_user3).to.be.equal(true, "Ton pubkey user3 not confirmed");
                expect(bal3_after.toNumber()).to.be.gte(bal3.minus(10**9).toNumber(), "Bad gas")

            })

            it("Users confirm eth relay accounts", async function () {
                await confirmEthRelayAccount(user2, user2_eth_addr);
                await confirmEthRelayAccount(user3, user3_eth_addr);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const user1_details = await user1Data.call({method: 'getDetails'});
                const confirmed_user1 = user1_details.eth_address_confirmed;
                expect(confirmed_user1).to.be.equal(true, "Eth pubkey user1 not confirmed");

                const user2_details = await user2Data.call({method: 'getDetails'});
                const confirmed_user2 = user2_details.eth_address_confirmed;
                expect(confirmed_user2).to.be.equal(true, "Eth pubkey user2 not confirmed");

                const user3_details = await user3Data.call({method: 'getDetails'});
                const confirmed_user3 = user3_details.eth_address_confirmed;
                expect(confirmed_user3).to.be.equal(true, "Eth pubkey user3 not confirmed");
            })

            it("Election on new round starts", async function () {
                await wait(5000);

                const tx = await startElection(user2);
                const election = await getElection(1);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }
                const round_num = await election.call({method: 'round_num'});
                expect(round_num.toString()).to.be.equal('1', "Bad election - round num");

                const {
                    value: {
                        round_num: _round_num,
                        election_start_time: _election_start_time,
                        election_addr: _election_addr,
                    }
                } = (await stakingRoot.getEvents('ElectionStarted')).pop();

                expect(_round_num.toString()).to.be.equal('1', "Bad election - round num");
                expect(_election_addr).to.be.equal(election.address, "Bad election - address");
            })

            it("Users request relay membership", async function () {
                const bal1 = await getBalance(user1Data.address);

                const tx = await requestRelayMembership(user1, user1Data);
                const election = await getElection(1);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }


                const bal1_after = await getBalance(user1Data.address);

                const {
                    value: {
                        round_num: _round_num1,
                        tokens: _tokens1,
                        ton_pubkey: _ton_pubkey1,
                        eth_address: _eth_address1,
                        lock_until: _lock_until1
                    }
                } = (await user1Data.getEvents('RelayMembershipRequested')).pop();

                const user1_token_balance = await userTokenBalance(user1Data);

                const user1_pk = new BigNumber(user1.keyPair.public, 16);
                const expected_ton_pubkey1 = `0x${user1_pk.toString(16)}`;
                const user1_eth = new BigNumber(user1_eth_addr.toLowerCase(), 16);
                const block_now = tx.now + 30 * 24 * 60 * 60;

                console.log(_lock_until1, block_now);
                expect(_round_num1.toString()).to.be.equal('1', 'Bad event - round num');
                expect(_tokens1.toString()).to.be.equal(user1_token_balance.toString(), "Bad event - tokens");
                expect(_ton_pubkey1.toString()).to.be.equal(expected_ton_pubkey1, "Bad event - ton pubkey");
                expect(_eth_address1.toString()).to.be.equal(user1_eth.toFixed(), "Bad event - eth address");
                // expect(Number(_lock_until1)).to.be.gte(Number(block_now), "Bad event - lock");
                expect(bal1_after.toNumber()).to.be.gte(bal1.minus(15**9).toNumber(), "Bad gas")

                await requestRelayMembership(user3, user3Data);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const {
                    value: {
                        round_num: _round_num3,
                        tokens: _tokens3,
                        ton_pubkey: _ton_pubkey3,
                        eth_address: _eth_address3,
                        lock_until: _lock_until3
                    }
                } = (await user3Data.getEvents('RelayMembershipRequested')).pop();

                const user3_token_balance = await userTokenBalance(user3Data);

                const user3_pk = new BigNumber(user3.keyPair.public, 16);
                const expected_ton_pubkey3 = `0x${user3_pk.toString(16)}`;
                const user3_eth = new BigNumber(user3_eth_addr.toLowerCase(), 16);

                expect(_round_num3.toString()).to.be.equal('1', 'Bad event - round num');
                expect(_tokens3.toString()).to.be.equal(user3_token_balance.toString(), "Bad event - tokens");
                expect(_ton_pubkey3.toString()).to.be.equal(expected_ton_pubkey3, "Bad event - ton pubkey");
                expect(_eth_address3.toString()).to.be.equal(user3_eth.toFixed(0), "Bad event - eth address");
                // expect(Number(_lock_until3)).to.be.gte(Number(block_now), "Bad event - lock");

                // const [req11, req22] = await election.call({method: 'getRequests', params: {limit: 10}});
                // console.log(req11, req22);
                // console.log(await showNode(election, 1));
                // console.log(await showNode(election, 2));

                await requestRelayMembership(user2, user2Data);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const {
                    value: {
                        round_num: _round_num2,
                        tokens: _tokens2,
                        ton_pubkey: _ton_pubkey2,
                        eth_address: _eth_address2,
                        lock_until: _lock_until2
                    }
                } = (await user2Data.getEvents('RelayMembershipRequested')).pop();

                const user2_token_balance = await userTokenBalance(user2Data);

                const user2_pk = new BigNumber(user2.keyPair.public, 16);
                const expected_ton_pubkey2 = `0x${user2_pk.toString(16)}`;
                const user2_eth = new BigNumber(user2_eth_addr.toLowerCase(), 16);

                expect(_round_num2.toString()).to.be.equal('1', 'Bad event - round num');
                expect(_tokens2.toString()).to.be.equal(user2_token_balance.toString(), "Bad event - tokens");
                expect(_ton_pubkey2.toString()).to.be.equal(expected_ton_pubkey2, "Bad event - ton pubkey");
                expect(_eth_address2.toString()).to.be.equal(user2_eth.toFixed(0), "Bad event - eth address");
                // expect(Number(_lock_until2)).to.be.gte(Number(block_now), "Bad event - lock");

                // now check requests sorted correctly
                // const q = await election.call({method: 'getRequests', params: {limit: 10}});
                // console.log(q);
                const {
                    _ton_keys: ton_keys,
                    _eth_addrs: eth_addrs,
                    _staker_addrs: staker_addrs,
                    _staked_tokens: staked_tokens
                } = await election.call({method: 'getRequests', params: {limit: 10}});
                // console.log(req1, req2, req3);
                // console.log(await showNode(election, 1));
                // console.log(await showNode(election, 2));
                // console.log(await showNode(election, 3));
                // console.log(user1.address, user2.address, user3.address);

                expect(staker_addrs[0]).to.be.equal(user3.address, "Bad request - staker addr");
                expect(staked_tokens[0].toString()).to.be.equal(user3_token_balance.toString(), "Bad request - token balance");
                expect(`0x${ton_keys[0].toString(16)}`).to.be.equal(expected_ton_pubkey3, "Bad request - ton pubkey");
                expect(eth_addrs[0]).to.be.equal(user3_eth.toFixed(0), "Bad request - eth addr");

                expect(staker_addrs[1]).to.be.equal(user2.address, "Bad request - staker addr");
                expect(staked_tokens[1].toString()).to.be.equal(user2_token_balance.toString(), "Bad request - token balance");
                expect(`0x${ton_keys[1].toString(16)}`).to.be.equal(expected_ton_pubkey2, "Bad request - ton pubkey");
                expect(eth_addrs[1]).to.be.equal(user2_eth.toFixed(0), "Bad request - eth addr");

                expect(staker_addrs[2]).to.be.equal(user1.address, "Bad request - staker addr");
                expect(staked_tokens[2].toString()).to.be.equal(user1_token_balance.toString(), "Bad request - token balance");
                expect(`0x${ton_keys[2].toString(16)}`).to.be.equal(expected_ton_pubkey1, "Bad request - ton pubkey");
                expect(eth_addrs[2]).to.be.equal(user1_eth.toFixed(0), "Bad request - eth addr");
            });

            it("Election ends, new round initialized", async function () {
                await wait(3000);

                const staking_details = await stakingRoot.call({method: 'getDetails'});
                const reward_rounds = staking_details.rewardRounds;

                const bal1 = await getBalance(user1Data.address);
                const tx = await endElection(user1);

                const round = await getRelayRound(1);
                await waitForDeploy(round.address);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const bal1_after = await getBalance(user1Data.address);
                logger.log(`Round 2 deployed - ${round.address}`)
                // const election = await getElection(2);

                expect(bal1_after.toNumber()).to.be.gte(bal1.minus(5 * 10**9).toNumber(), "Bad gas")

                // console.log('root', stakingRoot.address)
                // console.log('election', election.address);
                // console.log('round', round.address);

                const {
                    value: {
                        round_num: _round_num,
                        relay_requests: _relay_requests,
                        min_relays_ok: _min_relays_ok
                    }
                } = (await stakingRoot.getEvents('ElectionEnded')).pop();

                expect(_round_num.toString()).to.be.equal('1', "Bad election event - round num");
                expect(_relay_requests.toString()).to.be.equal('3', "Bad election event - relay requests");
                expect(_min_relays_ok).to.be.equal(true, "Bad election event - min relays");

                const {
                    value: {
                        round_num: _round_num1,
                        round_start_time: _round_start_time,
                        round_end_time: _round_end_time,
                        round_addr: _round_addr,
                        relays_count: _relays_count,
                        duplicate: _duplicate
                    }
                } = (await stakingRoot.getEvents('RelayRoundInitialized')).pop();

                expect(_round_num1.toString()).to.be.equal('1', "Bad relay init event - round num");
                expect(_round_addr.toString()).to.be.equal(round.address, "Bad relay init event - round addr");
                expect(_relays_count.toString()).to.be.equal('3', "Bad relay init event - relays count");
                expect(_duplicate).to.be.equal(false, "Bad relay init event - duplicate");

                const round_details = await round.call({method: 'getDetails'});

                const stored_round_num = round_details.round_num;
                const stored_relays_count = await round.call({method: 'relays_count'});
                const stored_total_tokens_staked = await round.call({method: 'total_tokens_staked'});
                const stored_reward_round_num = await round.call({method: 'reward_round_num'});
                const stored_relays_installed = round_details.relays_installed;
                const stored_duplicate = await round.call({method: 'duplicate'});

                const expected_staked_tokens = userDeposit * 6;

                expect(stored_round_num.toString()).to.be.equal('1', "Bad round created - round num");
                expect(stored_relays_count.toString()).to.be.equal('3', "Bad round created - relays count");
                expect(stored_total_tokens_staked.toString(16)).to.be.equal(expected_staked_tokens.toString(16), "Bad round created - total tokens staked");
                expect(stored_reward_round_num.toString()).to.be.equal('0', "Bad round created - reward round num");
                expect(stored_relays_installed).to.be.equal(true, "Bad round created - relays installed");
                expect(stored_duplicate).to.be.equal(false, "Bad round created - duplicate");

                const round_reward = await round.call({method: 'round_reward'});

                const staking_details_1 = await stakingRoot.call({method: 'getDetails'});
                const reward_rounds_new = staking_details_1.rewardRounds;
                // console.log(reward_rounds, reward_rounds_new, round_reward.toString());
                const expected_reward = round_reward.plus(new BigNumber(reward_rounds[0].totalReward));
                expect(expected_reward.toString()).to.be.equal(reward_rounds_new[0].totalReward.toString(), "Bad reward after relay round init");

                const relay_rounds_data = await stakingRoot.call({method: 'getRelayRoundsDetails'});
                expect(relay_rounds_data.currentRelayRound.toString()).to.be.equal('1', "Bad round installed in root");

                // check all relays are installed
                const relays = round_details.staker_addrs;
                expect(relays.includes(user1.address)).to.be.true;
                expect(relays.includes(user2.address)).to.be.true;
                expect(relays.includes(user3.address)).to.be.true;

                const election = await getElection(1);
                const bal = await getBalance(election.address);
                expect(bal.toFixed(0)).to.be.eq('0', 'Election not destroyed');
            });

            it("User1 get reward for origin round", async function() {
                await wait(1000);

                // deposit 1 token to sync rewards
                await depositTokens(stakingRoot, user1, userTokenWallet1, 1);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }
                const user1_rewards = await userRewardRounds(user1Data);

                const bal1 = await getBalance(user1Data.address);

                await getRewardForRelayRound(user1, user1Data, 0);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }
                const user1_rewards_1 = await userRewardRounds(user1Data);
                const staking_details = await stakingRoot.call({method: 'getDetails'});
                const rewards = staking_details.rewardRounds;
                const round_reward = rewardPerSec * RELAY_ROUND_TIME_1;

                const _userDeposit = await userTokenBalance(user1Data);
                const rew_per_share = new BigNumber(rewards[0].accRewardPerShare);
                const new_reward = rew_per_share.times(_userDeposit).div(1e18).minus(user1_rewards[0].reward_debt).dp(0, 1);

                const bal1_after = await getBalance(user1Data.address);
                expect(bal1_after.toNumber()).to.be.gte(bal1.minus(15**9).toNumber(), "Bad gas")
                const expected = new_reward.plus(user1_rewards[0].reward_balance).plus(round_reward);
                expect(expected.toString()).to.be.equal(user1_rewards_1[0].reward_balance.toString(), 'Bad reward');

                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const {
                    value: {
                        relay_round_num: _relay_round_num,
                        reward_round_num: _reward_round_num,
                        reward: _reward
                    }
                } = (await user1Data.getEvents('RelayRoundRewardClaimed')).pop();

                const expected_reward = rewardPerSec * RELAY_ROUND_TIME_1;
                expect(_relay_round_num.toString()).to.be.equal('0', "Bad relay round reward event - relay round");
                expect(_reward_round_num.toString()).to.be.equal('0', "Bad relay round reward event - reward round");
                expect(_reward.toString()).to.be.equal(expected_reward.toString(), "Bad relay round reward event - reward");
            });
        });

        describe("Not enough relay requests on election", async function() {
            it("New reward round starts", async function () {
                await startNewRewardRound();
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const staking_details = await stakingRoot.call({method: 'getDetails'});
                const reward_rounds = staking_details.rewardRounds;
                const last_reward_time = staking_details.lastRewardTime;
                const cur_round = reward_rounds[1];

                expect(reward_rounds.length).to.be.equal(2, "Bad reward rounds");
                expect(cur_round.rewardTokens).to.be.equal('0', 'Bad reward rounds balance');
                expect(parseInt(cur_round.accRewardPerShare, 16)).to.be.equal(0, 'Bad reward rounds share');
                expect(cur_round.totalReward).to.be.equal('0', 'Bad reward rounds reward');
                expect(cur_round.startTime).to.be.equal(last_reward_time.toString(), 'Bad reward rounds start time');
            });

            it("Election on new round starts", async function () {
                await wait(5000);

                const tx = await startElection(user3);
                const election = await getElection(2);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const round_num = await election.call({method: 'round_num'});
                expect(round_num.toString()).to.be.equal('2', "Bad election - round num");

                const { value: {
                    round_num: _round_num,
                    election_start_time: _election_start_time,
                    election_addr: _election_addr,
                } } = (await stakingRoot.getEvents('ElectionStarted')).pop();

                expect(_round_num.toString()).to.be.equal('2', "Bad election - round num");
                expect(_election_addr).to.be.equal(election.address, "Bad election - address");

            });

            it("Users request relay membership", async function() {
                const tx = await requestRelayMembership(user1, user1Data);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const { value: {
                    round_num: _round_num1,
                    tokens: _tokens1,
                    ton_pubkey: _ton_pubkey1,
                    eth_address: _eth_address1,
                    lock_until: _lock_until1
                } } = (await user1Data.getEvents('RelayMembershipRequested')).pop();

                const user1_token_balance = await userTokenBalance(user1Data);

                const user1_pk = new BigNumber(user1.keyPair.public, 16);
                const expected_ton_pubkey1 = `0x${user1_pk.toString(16).padStart(64, '0')}`;
                const user1_eth = new BigNumber(user1_eth_addr.toLowerCase(), 16);
                const block_now = tx.now + 30 * 24 * 60 * 60;

                expect(_round_num1.toString()).to.be.equal('2', 'Bad event - round num');
                expect(_tokens1.toString()).to.be.equal(user1_token_balance.toString(), "Bad event - tokens");
                expect(_ton_pubkey1.toString()).to.be.equal(expected_ton_pubkey1, "Bad event - ton pubkey");
                expect(_eth_address1.toString()).to.be.equal(user1_eth.toFixed(0), "Bad event - eth address");
                expect(Number(_lock_until1)).to.be.gte(Number(block_now), "Bad event - lock");
            });

            it("Election ends, not enough users participated, clone prev. round", async function() {
                await wait(3500);

                const staking_details = await stakingRoot.call({method: 'getDetails'});
                const reward_rounds = staking_details.rewardRounds;
                //
                // const round2 = await getRelayRound(2);
                // const round_details2 = await round2.call({method: 'getDetails'});
                // console.log(round_details2);

                const tx = await endElection(user1);

                const round = await getRelayRound(2);
                await waitForDeploy(round.address);
                logger.log(`Round 3 deployed - ${round.address}`);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }
                // const election = await getElection(2);

                // console.log('root', stakingRoot.address)
                // console.log('election', election.address);
                // console.log('round', round.address);

                const { value: {
                    round_num: _round_num,
                    relay_requests: _relay_requests,
                    min_relays_ok: _min_relays_ok
                } } = (await stakingRoot.getEvents('ElectionEnded')).pop();

                expect(_round_num.toString()).to.be.equal('2', "Bad election event - round num");
                expect(_relay_requests.toString()).to.be.equal('1', "Bad election event - relay requests");
                expect(_min_relays_ok).to.be.equal(false, "Bad election event - min relays");

                const { value: {
                    round_num: _round_num1,
                    round_start_time: _round_start_time,
                    round_end_time: _round_end_time,
                    round_addr: _round_addr,
                    relays_count: _relays_count,
                    duplicate: _duplicate
                } } = (await stakingRoot.getEvents('RelayRoundInitialized')).pop();

                expect(_round_num1.toString()).to.be.equal('2', "Bad relay init event - round num");
                expect(_round_addr.toString()).to.be.equal(round.address, "Bad relay init event - round addr");
                expect(_relays_count.toString()).to.be.equal('3', "Bad relay init event - relays count");
                expect(_duplicate).to.be.equal(true, "Bad relay init event - duplicate");

                const round_details = await round.call({method: 'getDetails'});

                const stored_round_num = round_details.round_num;
                const stored_relays_count = await round.call({method: 'relays_count'});
                const stored_total_tokens_staked = await round.call({method: 'total_tokens_staked'});
                const stored_reward_round_num = await round.call({method: 'reward_round_num'});
                const stored_relays_installed = round_details.relays_installed;
                const stored_duplicate = await round.call({method: 'duplicate'});

                const expected_staked_tokens = userDeposit * 6;

                expect(stored_round_num.toString()).to.be.equal('2', "Bad round created - round num");
                expect(stored_relays_count.toString()).to.be.equal('3', "Bad round created - relays count");
                expect(stored_total_tokens_staked.toString(16)).to.be.equal(expected_staked_tokens.toString(16), "Bad round created - total tokens staked");
                expect(stored_reward_round_num.toString()).to.be.equal('1', "Bad round created - reward round num");
                expect(stored_relays_installed).to.be.equal(true, "Bad round created - relays installed");
                expect(stored_duplicate).to.be.equal(true, "Bad round created - duplicate");

                const round_reward = await round.call({method: 'round_reward'});
                const staking_details_1 = await stakingRoot.call({method: 'getDetails'});
                const reward_rounds_new = staking_details_1.rewardRounds;
                // console.log(reward_rounds, reward_rounds_new, round_reward.toString());
                const expected_reward = round_reward.plus(new BigNumber(reward_rounds[1].totalReward));
                expect(expected_reward.toString()).to.be.equal(reward_rounds_new[1].totalReward.toString(), "Bad reward after relay round init");

                const relay_rounds_data = await stakingRoot.call({method: 'getRelayRoundsDetails'});
                expect(relay_rounds_data.currentRelayRound.toString()).to.be.equal('2', "Bad round installed in root");

                // check all relays are installed
                const relays = round_details.staker_addrs;
                expect(relays.includes(user1.address)).to.be.true;
                expect(relays.includes(user2.address)).to.be.true;
                expect(relays.includes(user3.address)).to.be.true;
            });

            it("Users get reward for prev relay round", async function() {
                await wait(1000);

                for (const i of [
                    [user1, userTokenWallet1, user1Data], [user2, userTokenWallet2, user2Data], [user3, userTokenWallet3, user3Data]
                ]) {
                    const [_user, _userTokenWallet, _userData] = i;

                    const relay_round = await getRelayRound(1);
                    const relay = await relay_round.call(
                        {method: 'getRelayByStakerAddress', params: {_relay_staker_addr: _user.address}}
                    );
                    const staked_tokens = new BigNumber(relay._staked_tokens.toString());
                    const total_tokens_staked = await relay_round.call({method: 'total_tokens_staked'});

                    // deposit 1 token to sync rewards
                    await depositTokens(stakingRoot, _user, _userTokenWallet, 1);
                    if (locklift.network === 'dev') {
                        await wait(DEV_WAIT);
                    }
                    const _user_rewards = await userRewardRounds(_userData);

                    await getRewardForRelayRound(_user, _userData, 1);
                    if (locklift.network === 'dev') {
                        await wait(DEV_WAIT);
                    }
                    const _user_rewards_1 = await userRewardRounds(_userData);

                    const round_reward = rewardPerSec * RELAY_ROUND_TIME_1;
                    const user_share = staked_tokens.times(1e18).div(total_tokens_staked).dp(0, 1);
                    const user_reward = user_share.times(round_reward).div(1e18).dp(0, 1);

                    const expected = user_reward.plus(_user_rewards[0].reward_balance);
                    expect(expected.toString()).to.be.equal(_user_rewards_1[0].reward_balance.toString(), 'Bad reward');

                    const {
                        value: {
                            relay_round_num: _relay_round_num,
                            reward_round_num: _reward_round_num,
                            reward: _reward
                        }
                    } = (await _userData.getEvents('RelayRoundRewardClaimed')).pop();

                    const expected_reward = user_reward;
                    expect(_relay_round_num.toString()).to.be.equal('1', "Bad relay round reward event - relay round");
                    expect(_reward_round_num.toString()).to.be.equal('0', "Bad relay round reward event - reward round");
                    expect(_reward.toString()).to.be.equal(expected_reward.toString(), "Bad relay round reward event - reward");
                }
            });

            it("Slash user", async function() {
                const staking_details = await stakingRoot.call({method: 'getDetails'});

                let rounds_rewards_data = staking_details.rewardRounds;
                // console.log(rounds_rewards_data);
                const round1_rewards_data = rounds_rewards_data[0];

                const user1_reward_before = await userRewardRounds(user1Data);
                const user1_reward = user1_reward_before[0].reward_balance;
                // console.log(user1_reward);

                const user1_token_reward = Math.floor(Math.floor(user1_reward * 1e10 / round1_rewards_data.totalReward) * round1_rewards_data.rewardTokens / 1e10);
                const user1_token_balance0 = await userTokenBalance(user1Data);
                // console.log(user1_token_balance0.toFixed(0));

                const staking_details_before = await stakingRoot.call({method: 'getDetails'});

                const tx = await slashUser(user1);

                const {
                    value: {
                        user: _user,
                        tokens_withdrawn: _tokens_withdraw
                    }
                } = (await stakingRoot.getEvents('RelaySlashed')).pop();

                const expected_withdraw = user1_token_balance0.plus(new BigNumber(user1_token_reward));
                expect(_tokens_withdraw.toString()).to.be.equal(expected_withdraw.toString(), "Bad slashed reward");

                const staking_details_after = await stakingRoot.call({method: 'getDetails'});

                const prev_token_balance = staking_details_before.tokenBalance;
                const after_token_balance = staking_details_after.tokenBalance;
                expect(prev_token_balance.minus(user1_token_balance0).toString()).to.be.equal(after_token_balance.toString(), "Bad token balance");
            });
        });

        describe("Destroy old relay round", async function() {
            it("Election on new round starts", async function () {
                await wait(5000);

                const tx = await startElection(user3);
                const election = await getElection(3);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const round_num = await election.call({method: 'round_num'});
                expect(round_num.toString()).to.be.equal('3', "Bad election - round num");

                const { value: {
                    round_num: _round_num,
                    election_start_time: _election_start_time,
                    election_addr: _election_addr,
                } } = (await stakingRoot.getEvents('ElectionStarted')).pop();

                expect(_round_num.toString()).to.be.equal('3', "Bad election - round num");
                expect(_election_addr).to.be.equal(election.address, "Bad election - address");
            });

            it("Election ends, not enough users participated, clone prev. round", async function() {
                await wait(3500);

                const staking_details = await stakingRoot.call({method: 'getDetails'});
                const reward_rounds = staking_details.rewardRounds;
                //
                // const round2 = await getRelayRound(2);
                // const round_details2 = await round2.call({method: 'getDetails'});
                // console.log(round_details2);

                const tx = await endElection(user1);

                const round = await getRelayRound(3);
                await waitForDeploy(round.address);
                logger.log(`Round 4 deployed - ${round.address}`);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }
                // const election = await getElection(2);

                // console.log('root', stakingRoot.address)
                // console.log('election', election.address);
                // console.log('round', round.address);

                const { value: {
                    round_num: _round_num,
                    relay_requests: _relay_requests,
                    min_relays_ok: _min_relays_ok
                } } = (await stakingRoot.getEvents('ElectionEnded')).pop();

                expect(_round_num.toString()).to.be.equal('3', "Bad election event - round num");
                expect(_relay_requests.toString()).to.be.equal('0', "Bad election event - relay requests");
                expect(_min_relays_ok).to.be.equal(false, "Bad election event - min relays");

                const { value: {
                    round_num: _round_num1,
                    round_start_time: _round_start_time,
                    round_end_time: _round_end_time,
                    round_addr: _round_addr,
                    relays_count: _relays_count,
                    duplicate: _duplicate
                } } = (await stakingRoot.getEvents('RelayRoundInitialized')).pop();

                expect(_round_num1.toString()).to.be.equal('3', "Bad relay init event - round num");
                expect(_round_addr.toString()).to.be.equal(round.address, "Bad relay init event - round addr");
                expect(_relays_count.toString()).to.be.equal('3', "Bad relay init event - relays count");
                expect(_duplicate).to.be.equal(true, "Bad relay init event - duplicate");

                const round_details = await round.call({method: 'getDetails'});

                const stored_round_num = round_details.round_num;
                const stored_relays_count = await round.call({method: 'relays_count'});
                const stored_total_tokens_staked = await round.call({method: 'total_tokens_staked'});
                const stored_reward_round_num = await round.call({method: 'reward_round_num'});
                const stored_relays_installed = round_details.relays_installed;
                const stored_duplicate = await round.call({method: 'duplicate'});

                const expected_staked_tokens = userDeposit * 6;

                expect(stored_round_num.toString()).to.be.equal('3', "Bad round created - round num");
                expect(stored_relays_count.toString()).to.be.equal('3', "Bad round created - relays count");
                expect(stored_total_tokens_staked.toString(16)).to.be.equal(expected_staked_tokens.toString(16), "Bad round created - total tokens staked");
                expect(stored_reward_round_num.toString()).to.be.equal('1', "Bad round created - reward round num");
                expect(stored_relays_installed).to.be.equal(true, "Bad round created - relays installed");
                expect(stored_duplicate).to.be.equal(true, "Bad round created - duplicate");

                const round_reward = await round.call({method: 'round_reward'});
                const staking_details_1 = await stakingRoot.call({method: 'getDetails'});
                const reward_rounds_new = staking_details_1.rewardRounds;
                // console.log(reward_rounds, reward_rounds_new, round_reward.toString());
                const expected_reward = round_reward.plus(new BigNumber(reward_rounds[1].totalReward));
                expect(expected_reward.toString()).to.be.equal(reward_rounds_new[1].totalReward.toString(), "Bad reward after relay round init");

                const relay_rounds_data = await stakingRoot.call({method: 'getRelayRoundsDetails'});
                expect(relay_rounds_data.currentRelayRound.toString()).to.be.equal('3', "Bad round installed in root");

                // check all relays are installed
                const relays = round_details.staker_addrs;
                expect(relays.includes(user1.address)).to.be.true;
                expect(relays.includes(user2.address)).to.be.true;
                expect(relays.includes(user3.address)).to.be.true;
            });

            it("Check old round destroyed (-2)", async function() {
                const round = await getRelayRound(0);

                const round_bal = await getBalance(round.address);

                expect(round_bal.toFixed(0)).to.be.equal('0', 'Round not destroyed');
            });
        });

        describe("Late round start", async function() {
            it("Election on new round starts", async function () {
                await wait(5000);

                const tx = await startElection(user3);
                const election = await getElection(4);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const round_num = await election.call({method: 'round_num'});
                expect(round_num.toString()).to.be.equal('4', "Bad election - round num");

                const { value: {
                    round_num: _round_num,
                    election_start_time: _election_start_time,
                    election_addr: _election_addr,
                } } = (await stakingRoot.getEvents('ElectionStarted')).pop();

                expect(_round_num.toString()).to.be.equal('4', "Bad election - round num");
                expect(_election_addr).to.be.equal(election.address, "Bad election - address");
            });

            it("Election ends late, not enough users participated, clone prev. round", async function() {
                // make sure current round ends after prev round end
                await wait(RELAY_ROUND_TIME_1 * 1000);

                const staking_details = await stakingRoot.call({method: 'getDetails'});
                const reward_rounds = staking_details.rewardRounds;
                //
                // const round2 = await getRelayRound(2);
                // const round_details2 = await round2.call({method: 'getDetails'});
                // console.log(round_details2);

                const root_round_details = await stakingRoot.call({method: 'getRelayRoundsDetails'});

                const tx = await endElection(user1);

                const round = await getRelayRound(4);
                await waitForDeploy(round.address);
                logger.log(`Round 5 deployed - ${round.address}`);
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }
                // const election = await getElection(2);

                // console.log('root', stakingRoot.address)
                // console.log('election', election.address);
                // console.log('round', round.address);

                const { value: {
                    round_num: _round_num,
                    relay_requests: _relay_requests,
                    min_relays_ok: _min_relays_ok
                } } = (await stakingRoot.getEvents('ElectionEnded')).pop();

                expect(_round_num.toString()).to.be.equal('4', "Bad election event - round num");
                expect(_relay_requests.toString()).to.be.equal('0', "Bad election event - relay requests");
                expect(_min_relays_ok).to.be.equal(false, "Bad election event - min relays");

                const { value: {
                    round_num: _round_num1,
                    round_start_time: _round_start_time,
                    round_end_time: _round_end_time,
                    round_addr: _round_addr,
                    relays_count: _relays_count,
                    duplicate: _duplicate
                } } = (await stakingRoot.getEvents('RelayRoundInitialized')).pop();

                expect(_round_num1.toString()).to.be.equal('4', "Bad relay init event - round num");
                expect(_round_addr.toString()).to.be.equal(round.address, "Bad relay init event - round addr");
                expect(_relays_count.toString()).to.be.equal('3', "Bad relay init event - relays count");
                expect(_duplicate).to.be.equal(true, "Bad relay init event - duplicate");

                const round_details = await round.call({method: 'getDetails'});

                const stored_round_num = round_details.round_num;
                const stored_relays_count = await round.call({method: 'relays_count'});
                const stored_total_tokens_staked = await round.call({method: 'total_tokens_staked'});
                const stored_reward_round_num = await round.call({method: 'reward_round_num'});
                const stored_relays_installed = round_details.relays_installed;
                const stored_duplicate = await round.call({method: 'duplicate'});

                const expected_staked_tokens = userDeposit * 6;

                expect(stored_round_num.toString()).to.be.equal('4', "Bad round created - round num");
                expect(stored_relays_count.toString()).to.be.equal('3', "Bad round created - relays count");
                expect(stored_total_tokens_staked.toString(16)).to.be.equal(expected_staked_tokens.toString(16), "Bad round created - total tokens staked");
                expect(stored_reward_round_num.toString()).to.be.equal('1', "Bad round created - reward round num");
                expect(stored_relays_installed).to.be.equal(true, "Bad round created - relays installed");
                expect(stored_duplicate).to.be.equal(true, "Bad round created - duplicate");

                const round_reward = await round.call({method: 'round_reward'});
                const staking_details_1 = await stakingRoot.call({method: 'getDetails'});
                const reward_rounds_new = staking_details_1.rewardRounds;
                // console.log(reward_rounds, reward_rounds_new, round_reward.toString());
                const expected_reward = round_reward.plus(new BigNumber(reward_rounds[1].totalReward));
                expect(expected_reward.toString()).to.be.equal(reward_rounds_new[1].totalReward.toString(), "Bad reward after relay round init");

                const relay_rounds_data = await stakingRoot.call({method: 'getRelayRoundsDetails'});
                expect(relay_rounds_data.currentRelayRound.toString()).to.be.equal('4', "Bad round installed in root");

                // check all relays are installed
                const relays = round_details.staker_addrs;
                expect(relays.includes(user1.address)).to.be.true;
                expect(relays.includes(user2.address)).to.be.true;
                expect(relays.includes(user3.address)).to.be.true;

                const relay_config = await stakingRoot.call({method: "getRelayConfig"});
                const root_round_details_1 = await stakingRoot.call({method: 'getRelayRoundsDetails'});
                expect(
                    root_round_details_1.currentRelayRoundStartTime.toNumber()
                ).to.be.gt(root_round_details.currentRelayRoundEndTime.toNumber(), "Bad new round start time");
            });
        });

        describe("Emergency situation", async function() {
           it("Set emergency", async function() {
                await setEmergency();
                const details = await stakingRoot.call({method: 'getDetails'});
                expect(details.emergency).to.be.true;
           })

            it("User withdraw tokens", async function() {
                const prev_details = await stakingRoot.call({method: 'getDetails'});
                const tx = await withdrawTokens(user2, userDeposit);
                await sleep(1000);
                const after_details = await stakingRoot.call({method: 'getDetails'});

                const expected_bal = prev_details.tokenBalance.minus(userDeposit).toFixed(0);
                expect(after_details.tokenBalance.toFixed(0)).to.be.equal(expected_bal);
            });

           it("Rescuer withdraw all tokens", async function() {
               const prev_details = await stakingRoot.call({method: 'getDetails'});
               await withdrawEmergency(100, false);
               await sleep(1000);
               const after_details = await stakingRoot.call({method: 'getDetails'});
               expect(after_details.tokenBalance.toFixed(0)).to.be.equal(prev_details.tokenBalance.minus(100).toFixed(0));

               await withdrawEmergency(0, true);
               await sleep(1000);
               const after_details_2 = await stakingRoot.call({method: 'getDetails'});
               expect(after_details_2.tokenBalance.toFixed(0)).to.be.equal('0');
               expect(after_details_2.rewardTokenBalance.toFixed(0)).to.be.equal('0');
           });
        });
    });
})
