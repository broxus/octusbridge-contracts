const {
    expect,
} = require('./utils');
const BigNumber = require('bignumber.js');
const logger = require('mocha-logger');
const {
    convertCrystal
} = locklift.utils;

const EMPTY_TVM_CELL = 'te6ccgEBAQEAAgAAAA==';

const TOKEN_PATH = '../node_modules/ton-eth-bridge-token-contracts/free-ton/build';

const stringToBytesArray = (dataString) => {
    return Buffer.from(dataString).toString('hex')
};

const getRandomNonce = () => Math.random() * 64000 | 0;

const afterRun = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));


const bridge = '0:9cc3d8668d57d387eae54c4398a1a0b478b6a8c3a0f2b5265e641a212b435231'
const user1_eth_addr = '0x93E05804b0A58668531F65A93AbfA1aD8F7F5B2b';
const user2_eth_addr = '0x197216E3421D13A72Fdd79A44d8d89f121dcab6C';

let stakingRoot;
let stakingToken;
let stakingWallet;

let user1;
let user1Data;
let user2;
let user2Data;
let stakingOwner;
let userTokenWallet1;
let userTokenWallet2;
let ownerWallet;
let userInitialTokenBal = 100000;
let rewardTokensBal = 10000;
let userDeposit = 100;
let rewardPerSec = 1000;
let user1Balance;
let user2Balance;
let balance_err;

const RELAY_ROUND_TIME_1 = 10;
const RELAYS_COUNT_1 = 10;


describe('Test Staking Rewards', async function () {
    this.timeout(10000000);

    const deployTokenRoot = async function (token_name, token_symbol) {
        const RootToken = await locklift.factory.getContract('RootTokenContract', TOKEN_PATH);
        const TokenWallet = await locklift.factory.getContract('TONTokenWallet', TOKEN_PATH);
        const [keyPair] = await locklift.keys.getKeyPairs();

        const _root = await locklift.giver.deployContract({
            contract: RootToken,
            constructorParams: {
                root_public_key_: `0x${keyPair.public}`,
                root_owner_address_: locklift.ton.zero_address
            },
            initParams: {
                name: stringToBytesArray(token_name),
                symbol: stringToBytesArray(token_symbol),
                decimals: 9,
                wallet_code: TokenWallet.code,
                _randomNonce: getRandomNonce(),
            },
            keyPair,
        }, locklift.utils.convertCrystal(15, 'nano'));
        _root.afterRun = afterRun;
        _root.setKeyPair(keyPair);

        return _root;
    }

    const deployTokenWallets = async function(users) {
        return await Promise.all(users.map(async (user) => {
            await user.runTarget({
                contract: stakingToken,
                method: 'deployEmptyWallet',
                params: {
                    deploy_grams: convertCrystal(1, 'nano'),
                    wallet_public_key_: 0,
                    owner_address_: user.address,
                    gas_back_address: user.address
                },
                value: convertCrystal(2, 'nano'),
            });

            const userTokenWalletAddress = await stakingToken.call({
                method: 'getWalletAddress',
                params: {
                    wallet_public_key_: 0,
                    owner_address_: user.address
                },
            });

            let userTokenWallet = await locklift.factory.getContract('TONTokenWallet', TOKEN_PATH);
            userTokenWallet.setAddress(userTokenWalletAddress);
            return userTokenWallet;
        }));
    };

    const deployAccount = async function (key, value) {
        const Account = await locklift.factory.getAccount('Wallet');
        let account = await locklift.giver.deployContract({
            contract: Account,
            constructorParams: {},
            initParams: {
                _randomNonce: Math.random() * 6400 | 0,
            },
            keyPair: key
        }, locklift.utils.convertCrystal(value, 'nano'));
        account.setKeyPair(key);
        account.afterRun = afterRun;
        return account;
    }

    const getUserTokenWallet = async function (user) {
        const expectedWalletAddr = await stakingToken.call({
            method: 'getWalletAddress',
            params: {
                wallet_public_key_: 0,
                owner_address_: user.address
            }
        });
        const userTokenWallet = await locklift.factory.getContract('TONTokenWallet', TOKEN_PATH);
        userTokenWallet.setAddress(expectedWalletAddr);
        return userTokenWallet;
    }

    const checkTokenBalances = async function(userTokenWallet, userAccount, pool_wallet_bal, pool_bal, pool_reward_bal, user_bal, user_data_bal) {
        const _pool_wallet_bal = await stakingWallet.call({method: 'balance'});
        const _pool_bal = await stakingRoot.call({method: 'tokenBalance'});
        const _pool_reward_bal = await stakingRoot.call({method: 'rewardTokenBalance'});
        const _user_bal = await userTokenWallet.call({method: 'balance'});
        const _user_data_bal = await userAccount.call({method: 'token_balance'});

        // console.log(_pool_wallet_bal.toString(), _pool_bal.toString(), _pool_reward_bal.toString(), _user_bal.toString(), _user_data_bal.toString());

        expect(_pool_wallet_bal.toNumber()).to.be.equal(pool_wallet_bal, 'Pool wallet balance bad');
        expect(_pool_bal.toNumber()).to.be.equal(pool_bal, 'Pool balance bad');
        expect(_pool_reward_bal.toNumber()).to.be.equal(pool_reward_bal, 'Pool reward balance bad');
        expect(_user_bal.toNumber()).to.be.equal(user_bal, 'User balance bad');
        expect(_user_data_bal.toNumber()).to.be.equal(user_data_bal, 'User data balance bad');
    }

    const checkStakingRewardRounds = async function (rewardRounds) {
        const _reward_rounds = await stakingRoot.call({method: 'rewardRounds'});
        console.log(_reward_rounds);
    }

    const startNewRewardRound = async function () {
        return await stakingOwner.runTarget({
            contract: stakingRoot,
            method: 'startNewRewardRound',
            params: {
                send_gas_to: stakingOwner.address,
            },
            value: locklift.utils.convertCrystal(5, 'nano')
        });
    }

    const claimReward = async function(user) {
        return await user.runTarget({
            contract: stakingRoot,
            method: 'claimReward',
            params: {
                send_gas_to: user.address,
            },
            value: locklift.utils.convertCrystal(1, 'nano')
        });
    }

    const checkReward = async function(userData, prevRewData, prevRewardTime, newRewardTime) {
        const user_rew_after = await userData.call({method: 'rewardRounds'});
        const user_rew_balance_before = prevRewData[0].reward_balance;
        const user_rew_balance_after = user_rew_after[0].reward_balance;

        const reward = user_rew_balance_after - user_rew_balance_before;

        const time_passed = newRewardTime - prevRewardTime;
        const expected_reward = rewardPerSec * time_passed;

        expect(reward).to.be.equal(expected_reward, 'Bad reward');
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

    const getRelayRound = async function (round_num) {
        const addr = await stakingRoot.call({
            method: 'getRelayRoundAddress',
            params: {round_num: round_num}
        });
        const round = await locklift.factory.getContract('RelayRound');
        round.setAddress(addr);
        return round;
    }

    const getUserDataAccount = async function (_user) {
        const userData = await locklift.factory.getContract('UserData');
        userData.setAddress(await stakingRoot.call({
            method: 'getUserDataAddress',
            params: {user: _user.address}
        }));
        return userData
    }

    const depositTokens = async function (user, _userTokenWallet, depositAmount, reward=false) {
        var payload;
        const DEPOSIT_PAYLOAD = 'te6ccgEBAQEAAwAAAgA=';
        const REWARD_DEPOSIT_PAYLOAD = 'te6ccgEBAQEAAwAAAgE=';
        if (reward) {
            payload = REWARD_DEPOSIT_PAYLOAD;
        } else {
            payload = DEPOSIT_PAYLOAD;
        }

        return await user.runTarget({
            contract: _userTokenWallet,
            method: 'transferToRecipient',
            params: {
                recipient_public_key: 0,
                recipient_address: stakingRoot.address,
                tokens: depositAmount,
                deploy_grams: 0,
                transfer_grams: 0,
                send_gas_to: user.address,
                notify_receiver: true,
                payload: payload
            },
            value: locklift.utils.convertCrystal(2.5, 'nano')
        });
    };

    const withdrawTokens = async function(user, withdraw_amount) {
        return await user.runTarget({
            contract: stakingRoot,
            method: 'withdraw',
            params: {
                amount: withdraw_amount,
                send_gas_to: user.address
            },
            value: convertCrystal(1.5, 'nano')
        });
    };

    describe('Setup contracts', async function() {
        describe('Token', async function() {
            it('Deploy root', async function() {
                stakingToken = await deployTokenRoot('Farm token', 'FT');
            });
        });

        describe('Users', async function() {
            it('Deploy users accounts', async function() {
                let users = [];
                for (const i of [1, 1, 1]) {
                    const [keyPair] = await locklift.keys.getKeyPairs();
                    const account = await deployAccount(keyPair, 25);
                    logger.log(`User address: ${account.address}`);

                    const {
                        acc_type_name
                    } = await locklift.ton.getAccountType(account.address);

                    expect(acc_type_name).to.be.equal('Active', 'User account not active');
                    users.push(account);
                }
                [user1, user2, stakingOwner] = users;
            });

            it('Deploy users token wallets', async function() {
                [ userTokenWallet1, userTokenWallet2, ownerWallet ] = await deployTokenWallets([user1, user2, stakingOwner]);
            });

            it('Mint tokens to users', async function() {
                for (const i of [userTokenWallet2, userTokenWallet1, ownerWallet]) {
                    await stakingToken.run({
                        method: 'mint',
                        params: {
                            tokens: userInitialTokenBal,
                            to: i.address
                        }
                    });
                }

                const balance1 = await userTokenWallet1.call({method: 'balance'});
                const balance2 = await userTokenWallet2.call({method: 'balance'});
                const balance3 = await ownerWallet.call({method: 'balance'});

                expect(balance1.toNumber()).to.be.equal(userInitialTokenBal, 'User ton token wallet empty');
                expect(balance2.toNumber()).to.be.equal(userInitialTokenBal, 'User ton token wallet empty');
                expect(balance3.toNumber()).to.be.equal(userInitialTokenBal, 'User ton token wallet empty');

            });
        });

        describe('Staking', async function() {
            it('Deploy staking', async function () {
                const [keyPair] = await locklift.keys.getKeyPairs();

                const StakingRootDeployer = await locklift.factory.getContract('StakingRootDeployer');
                const stakingRootDeployer = await locklift.giver.deployContract({
                    contract: StakingRootDeployer,
                    constructorParams: {},
                    keyPair: keyPair,
                }, locklift.utils.convertCrystal(10, 'nano'));

                logger.log(`Deploying stakingRoot`);
                stakingRoot = await locklift.factory.getContract('Staking');
                stakingRoot.setAddress((await stakingRootDeployer.run({
                    method: 'deploy',
                    params: {
                        stakingCode: stakingRoot.code,
                        _admin: stakingOwner.address,
                        _tokenRoot: stakingToken.address,
                        _dao_root: stakingOwner.address,
                        _rewarder: stakingOwner.address,
                        _bridge: bridge
                    }
                })).decoded.output.value0)
                logger.log(`StakingRoot address: ${stakingRoot.address}`);
                logger.log(`StakingRoot owner address: ${stakingOwner.address}`);
                logger.log(`StakingRoot token root address: ${stakingToken.address}`);

                const staking_wallet_addr = await stakingRoot.call({method: 'tokenWallet'});
                logger.log(`Staking token wallet: ${staking_wallet_addr}`);

                stakingWallet = await locklift.factory.getContract('TONTokenWallet', TOKEN_PATH);
                stakingWallet.setAddress(staking_wallet_addr);

                // call in order to check if wallet is deployed
                const details = await stakingWallet.call({method: 'getDetails'});
                expect(details.owner_address).to.be.equal(stakingRoot.address, 'Wrong staking token wallet owner');
                expect(details.receive_callback).to.be.equal(stakingRoot.address, 'Wrong staking token wallet receive callback');
                expect(details.root_address).to.be.equal(stakingToken.address, 'Wrong staking token wallet root');
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
                });
                logger.log(`Installing UserData code`);
                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'installOrUpdateUserDataCode',
                    params: {code: UserData.code, send_gas_to: stakingOwner.address},
                });
                logger.log(`Installing ElectionCode code`);
                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'installOrUpdateElectionCode',
                    params: {code: Election.code, send_gas_to: stakingOwner.address},
                });
                logger.log(`Installing RelayRoundCode code`);
                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'installOrUpdateRelayRoundCode',
                    params: {code: RelayRound.code, send_gas_to: stakingOwner.address},
                });
                logger.log(`Set staking to Active`);
                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'setActive',
                    params: {new_active: true, send_gas_to: stakingOwner.address},
                });

                const active = await stakingRoot.call({method: 'isActive'});
                expect(active).to.be.equal(true, "Staking not active");
            });

            it('Sending reward tokens to staking', async function() {
                const amount = rewardTokensBal;

                await depositTokens(stakingOwner, ownerWallet, amount, true);

                const staking_balance = await stakingWallet.call({method: 'balance'});
                const staking_balance_stored = await stakingRoot.call({method: 'rewardTokenBalance'});

                expect(staking_balance.toString()).to.be.equal(amount.toString(), 'Farm pool balance empty');
                expect(staking_balance_stored.toString()).to.be.equal(amount.toString(), 'Farm pool balance not recognized');
            });

            it("Setting relay config for testing", async function() {
                // super minimal relay config for local testing
                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'setRelayConfig',
                    params: {
                        relay_round_time: RELAY_ROUND_TIME_1,
                        election_time: 4,
                        time_before_election: 5,
                        relays_count: RELAYS_COUNT_1,
                        min_relays_count: 1,
                        send_gas_to: stakingOwner.address
                    },
                });

                const relays_count = await stakingRoot.call({method: 'relaysCount'});
                expect(relays_count.toString()).to.be.equal('10', "Relay config not installed");
            })
        });
    });

    describe('Basic relay pipeline', async function () {
        describe('Multiple users farming 1 round, 1 relay', async function() {
            let user1_deposit_time;
            let user2_deposit_time;
            let user1_withdraw_time;
            let user2_withdraw_time;

            it('Users deposit tokens', async function () {
                await depositTokens(user1, userTokenWallet1, userDeposit);
                user1Data = await getUserDataAccount(user1);

                await checkTokenBalances(
                    userTokenWallet1, user1Data, rewardTokensBal + userDeposit,
                    userDeposit, rewardTokensBal, userInitialTokenBal - userDeposit, userDeposit
                );
                user1_deposit_time = await stakingRoot.call({method: 'lastRewardTime'});

                await depositTokens(user2, userTokenWallet2, userDeposit);
                user2Data = await getUserDataAccount(user2);

                await checkTokenBalances(
                    userTokenWallet2, user2Data, rewardTokensBal + userDeposit * 2,
                    userDeposit * 2, rewardTokensBal, userInitialTokenBal - userDeposit, userDeposit
                );
                user2_deposit_time = await stakingRoot.call({method: 'lastRewardTime'});
            });

            it("Creating origin relay round", async function() {
                const user1_pk = new BigNumber(user1.keyPair.public, 16);
                const user1_eth = new BigNumber(user1_eth_addr.toLowerCase(), 16);

                const input_params = {
                    staker_addrs: [user1.address],
                    ton_pubkeys: [user1_pk.toFixed()],
                    eth_addrs: [user1_eth.toFixed()],
                    staked_tokens: [1],
                    send_gas_to: stakingOwner.address
                }

                const reward_rounds = await stakingRoot.call({method: 'rewardRounds'});

                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'createOriginRelayRound',
                    params: input_params,
                    value: convertCrystal(1.6, 'nano')
                });

                const round = await getRelayRound(1);
                const total_tokens_staked = await round.call({method: 'total_tokens_staked'});
                const round_reward = await round.call({method: 'round_reward'});
                const relays_count = await round.call({method: 'relays_count'});
                const reward_round_num = await round.call({method: 'reward_round_num'});

                const _round_reward = RELAY_ROUND_TIME_1 * rewardPerSec;
                expect(total_tokens_staked.toString()).to.be.equal('1', "Bad relay round");
                expect(round_reward.toString()).to.be.equal(_round_reward.toString(), "Bad relay round");
                expect(relays_count.toString()).to.be.equal('1', "Bad relay round");
                expect(reward_round_num.toString()).to.be.equal('0', "Bad relay round");

                const reward_rounds_new = await stakingRoot.call({method: 'rewardRounds'});
                const expected_reward = round_reward.plus(new BigNumber(reward_rounds[0].totalReward));
                expect(expected_reward.toString()).to.be.equal(reward_rounds_new[0].totalReward.toString(), "Bad reward after relay round init");

                const { value: {
                    round_num: _round_num,
                    round_start_time: _round_start_time,
                    round_addr: _round_addr,
                    relays: _relays
                } } = (await stakingRoot.getEvents('RelayRoundInitialized')).pop();

                expect(_round_num.toString()).to.be.equal('1', "Bad event");
                expect(_round_addr).to.be.equal(round.address, "Bad event");

                const relay = _relays[0];
                expect(relay.staker_addr).to.be.equal(user1.address, "Relay creation fail - staker addr");
                expect(relay.ton_pubkey).to.be.equal(`0x${user1_pk.toString(16)}`, "Relay creation fail - ton pubkey");
                expect(relay.eth_addr).to.be.equal(user1_eth.toFixed(), "Relay creation fail - eth addr");
                expect(relay.staked_tokens).to.be.equal('1', "Relay creation fail - staked tokens");
            });

            it("Election on new round starts", async function() {
                await wait(5000);

                await user1.runTarget({
                    contract: stakingRoot,
                    method: 'startElectionOnNewRound',
                    params: {send_gas_to: user1.address},
                    value: convertCrystal(1.6, 'nano')
                });

                const election = await getElection(2);

                const round_num = await election.call({method: 'round_num'});
                expect(round_num.toString()).to.be.equal('2', "Bad election - round num");

                const { value: {
                    round_num: _round_num,
                    election_start_time: _election_start_time,
                    election_addr: _election_addr,
                } } = (await stakingRoot.getEvents('ElectionStarted')).pop();

                expect(_round_num.toString()).to.be.equal('2', "Bad election - round num");
                expect(_election_addr).to.be.equal(election.address, "Bad election - address");
            })

            return;

            it('Users withdraw tokens', async function () {
                const user1_rew_before = await user1Data.call({method: 'rewardRounds'});
                await withdrawTokens(user1, userDeposit);

                user1_withdraw_time = await stakingRoot.call({method: 'lastRewardTime'});

                const user1_rew_after = await user1Data.call({method: 'rewardRounds'});
                const reward1 = user1_rew_after[0].reward_balance - user1_rew_before[0].reward_balance;

                const time_passed_1 = user2_deposit_time - user1_deposit_time;
                const expected_reward_1 = rewardPerSec * time_passed_1;

                const time_passed_2 = user1_withdraw_time - user2_deposit_time;
                const expected_reward_2 = rewardPerSec * 0.5 * time_passed_2;

                const expected_reward_final = (expected_reward_1 + expected_reward_2);

                expect(reward1).to.be.equal(expected_reward_final, 'Bad reward 1 user (low)');

                await checkTokenBalances(
                    userTokenWallet1, user1Data, rewardTokensBal + userDeposit,
                    userDeposit, rewardTokensBal, userInitialTokenBal, 0
                );

                const user2_rew_before = await user2Data.call({method: 'rewardRounds'});
                await withdrawTokens(user2, userDeposit);

                const user2_rew_after = await user2Data.call({method: 'rewardRounds'});
                user2_withdraw_time = await stakingRoot.call({method: 'lastRewardTime'});

                const reward2 = user2_rew_after[0].reward_balance - user2_rew_before[0].reward_balance;

                const time_passed_21 = user1_withdraw_time - user2_deposit_time;
                const expected_reward_21 = rewardPerSec * 0.5 * time_passed_21;

                const time_passed_22 = user2_withdraw_time - user1_withdraw_time;
                const expected_reward_22 = rewardPerSec * time_passed_22;
                const expected_reward_final_2 = (expected_reward_22 + expected_reward_21)

                expect(reward2).to.be.equal(expected_reward_final_2, 'Bad reward 2 user (low)');

                await checkTokenBalances(
                    userTokenWallet2, user2Data, rewardTokensBal,
                    0, rewardTokensBal, userInitialTokenBal, 0
                );
            });

            it("Claim rewards (expect fail)", async function () {
                const user1_reward_before = await user1Data.call({method: 'rewardRounds'});

                await claimReward(user1);
                await checkTokenBalances(
                    userTokenWallet1, user1Data, rewardTokensBal,
                    0, rewardTokensBal, userInitialTokenBal, 0
                );

                const user1_reward_after = await user1Data.call({method: 'rewardRounds'});
                expect(user1_reward_before[0].reward_balance).to.be.equal(user1_reward_after[0].reward_balance, "Claim reward fail");

                const user2_reward_before = await user2Data.call({method: 'rewardRounds'});

                await claimReward(user2);
                await checkTokenBalances(
                    userTokenWallet1, user2Data, rewardTokensBal,
                    0, rewardTokensBal, userInitialTokenBal, 0
                );

                const user2_reward_after = await user2Data.call({method: 'rewardRounds'});
                expect(user2_reward_before[0].reward_balance).to.be.equal(user2_reward_after[0].reward_balance, "Claim reward fail");
            })

            it("New reward round starts", async function () {
                await startNewRewardRound();

                const reward_rounds = await stakingRoot.call({method: 'rewardRounds'});
                const last_reward_time = await stakingRoot.call({method: 'lastRewardTime'});
                const cur_round = reward_rounds[1];

                expect(reward_rounds.length).to.be.equal(2, "Bad reward rounds");
                expect(cur_round.rewardTokens).to.be.equal('0', 'Bad reward rounds balance');
                expect(parseInt(cur_round.accRewardPerShare, 16)).to.be.equal(0, 'Bad reward rounds share');
                expect(cur_round.totalReward).to.be.equal('0', 'Bad reward rounds reward');
                expect(cur_round.startTime).to.be.equal(last_reward_time.toString(), 'Bad reward rounds start time');
            });

            it("Claim rewards", async function () {
                let round1_rewards_data = await stakingRoot.call({method: 'rewardRounds'});
                round1_rewards_data = round1_rewards_data[0];

                const user1_reward_before = await user1Data.call({method: 'rewardRounds'});
                const user2_reward_before = await user2Data.call({method: 'rewardRounds'});

                const user1_reward = user1_reward_before[0].reward_balance;
                const user2_reward = user2_reward_before[0].reward_balance;

                const user1_token_reward = Math.floor(Math.floor(user1_reward * 1e10 / round1_rewards_data.totalReward) * round1_rewards_data.rewardTokens / 1e10);
                const user2_token_reward = Math.floor(Math.floor(user2_reward * 1e10 / round1_rewards_data.totalReward) * round1_rewards_data.rewardTokens / 1e10);

                await claimReward(user1);
                await checkTokenBalances(
                    userTokenWallet1, user1Data, rewardTokensBal - user1_token_reward,
                    0, rewardTokensBal - user1_token_reward, userInitialTokenBal + user1_token_reward, 0
                );
                user1Balance = userInitialTokenBal + user1_token_reward;

                const user1_reward_after = await user1Data.call({method: 'rewardRounds'});
                expect(user1_reward_after[0].reward_balance).to.be.equal('0', "Claim reward fail");

                const remaining_balance = rewardTokensBal - user1_token_reward - user2_token_reward;
                await claimReward(user2);
                await checkTokenBalances(
                    userTokenWallet2, user2Data, remaining_balance,
                    0, remaining_balance, userInitialTokenBal + user2_token_reward, 0
                );
                user2Balance = userInitialTokenBal + user2_token_reward;
                balance_err = remaining_balance;

                const user2_reward_after = await user2Data.call({method: 'rewardRounds'});
                expect(user2_reward_after[0].reward_balance).to.be.equal('0', "Claim reward fail");
            });
        });

        describe.skip("Multiple users farming several rounds", async function() {
            let round2_start_time;
            let round2_user1_share;
            let round2_user2_share;

            it("Deposit reward", async function() {
                await depositTokens(stakingOwner, ownerWallet, rewardTokensBal, true);
                const staking_balance = await stakingWallet.call({method: 'balance'});
                const staking_reward_balance_stored = await stakingRoot.call({method: 'rewardTokenBalance'});
                const staking_balance_stored = await stakingRoot.call({method: 'tokenBalance'});

                // console.log(staking_balance.toString(), staking_reward_balance_stored.toString(), staking_balance_stored.toString())

                const realRewardTokensBal = rewardTokensBal + balance_err;
                expect(staking_balance.toString()).to.be.equal(realRewardTokensBal.toString(), 'Farm pool balance empty');
                expect(staking_reward_balance_stored.toString()).to.be.equal(realRewardTokensBal.toString(), 'Farm pool reward balance not recognized');
                expect(staking_balance_stored.toString()).to.be.equal('0', 'Farm pool reward balance not recognized');

                const reward_rounds = await stakingRoot.call({method: 'rewardRounds'});
                const cur_round = reward_rounds[1];

                expect(cur_round.rewardTokens).to.be.equal(rewardTokensBal.toString(), 'Bad reward rounds balance');
                expect(cur_round.totalReward).to.be.equal('0', 'Bad reward rounds reward');
            });

            it("User 1 deposit", async function () {
                await depositTokens(user1, userTokenWallet1, userDeposit);
                const realRewardTokensBal = rewardTokensBal + balance_err;
                await checkTokenBalances(
                    userTokenWallet1, user1Data, realRewardTokensBal + userDeposit,
                    userDeposit, realRewardTokensBal, user1Balance - userDeposit, userDeposit
                );
                user1Balance -= userDeposit;
            });

            it("New reward round starts", async function () {
                await startNewRewardRound();

                const reward_rounds = await stakingRoot.call({method: 'rewardRounds'});
                const last_reward_time = await stakingRoot.call({method: 'lastRewardTime'});
                const cur_round = reward_rounds[2];

                round2_start_time = last_reward_time;

                expect(reward_rounds.length).to.be.equal(3, "Bad reward rounds");
                expect(cur_round.rewardTokens).to.be.equal('0', 'Bad reward rounds balance');
                expect(parseInt(cur_round.accRewardPerShare, 16)).to.be.equal(0, 'Bad reward rounds share');
                expect(cur_round.totalReward).to.be.equal('0', 'Bad reward rounds reward');
                expect(cur_round.startTime).to.be.equal(last_reward_time.toString(), 'Bad reward rounds start time');
            });

            it("Deposit reward", async function() {
                const last_reward_time = await stakingRoot.call({method: 'lastRewardTime'});

                await depositTokens(stakingOwner, ownerWallet, rewardTokensBal, true);
                const staking_balance = await stakingWallet.call({method: 'balance'});
                const staking_reward_balance_stored = await stakingRoot.call({method: 'rewardTokenBalance'});
                const staking_balance_stored = await stakingRoot.call({method: 'tokenBalance'});

                const expected_balance = rewardTokensBal * 2 + userDeposit + balance_err;
                const expected_reward_balance = rewardTokensBal * 2 + balance_err;
                expect(staking_balance.toString()).to.be.equal(expected_balance.toString(), 'Farm pool balance empty');
                expect(staking_reward_balance_stored.toString()).to.be.equal(expected_reward_balance.toString(), 'Farm pool reward balance not recognized');
                expect(staking_balance_stored.toString()).to.be.equal(userDeposit.toString(), 'Farm pool reward balance not recognized');

                const reward_rounds = await stakingRoot.call({method: 'rewardRounds'});
                const cur_round = reward_rounds[2];

                const last_reward_time_2 = await stakingRoot.call({method: 'lastRewardTime'});
                const expected_reward = (last_reward_time_2 - last_reward_time) * rewardPerSec;
                expect(cur_round.rewardTokens).to.be.equal(rewardTokensBal.toString(), 'Bad reward rounds balance');
                expect(cur_round.totalReward).to.be.equal(expected_reward.toString(), 'Bad reward rounds reward');
            });

            it("User 2 deposit", async function () {
                await depositTokens(user2, userTokenWallet2, userDeposit);
                await checkTokenBalances(
                    userTokenWallet2, user2Data, rewardTokensBal * 2 + userDeposit * 2 + balance_err,
                    userDeposit * 2, rewardTokensBal * 2 + balance_err, user2Balance - userDeposit, userDeposit
                );
                user2Balance = user2Balance - userDeposit;

                const last_reward_time = await stakingRoot.call({method: 'lastRewardTime'});
                const time_passed = last_reward_time - round2_start_time;
                round2_user1_share = time_passed * rewardPerSec;
            });

            it("New reward round starts", async function () {
                const prev_reward_time = await stakingRoot.call({method: 'lastRewardTime'});
                await startNewRewardRound();

                const reward_rounds = await stakingRoot.call({method: 'rewardRounds'});
                const last_reward_time = await stakingRoot.call({method: 'lastRewardTime'});
                const cur_round = reward_rounds[3];

                const time_passed = last_reward_time - prev_reward_time;
                round2_user1_share += time_passed * (rewardPerSec / 2);
                round2_user2_share = time_passed * (rewardPerSec / 2);

                expect(reward_rounds.length).to.be.equal(4, "Bad reward rounds");
                expect(cur_round.rewardTokens).to.be.equal('0', 'Bad reward rounds balance');
                expect(parseInt(cur_round.accRewardPerShare, 16)).to.be.equal(0, 'Bad reward rounds share');
                expect(cur_round.totalReward).to.be.equal('0', 'Bad reward rounds reward');
                expect(cur_round.startTime).to.be.equal(last_reward_time.toString(), 'Bad reward rounds start time');
            });

            it("Users withdraw tokens", async function () {
                const reward_rounds = await stakingRoot.call({method: 'rewardRounds'});

                var user1_data = await user1Data.call({method: 'rewardRounds'});
                var user2_data = await user2Data.call({method: 'rewardRounds'});

                expect(user1_data.length).to.be.equal(2, "Bad user1 data length");
                expect(user2_data.length).to.be.equal(3, "Bad user2 data length");

                expect(user1_data[1].reward_balance).to.be.equal('0', "Bad user1 round reward");
                expect(user2_data[2].reward_balance).to.be.equal('0', "Bad user2 round reward");

                await withdrawTokens(user1, userDeposit);
                await checkTokenBalances(
                    userTokenWallet1, user1Data, rewardTokensBal * 2 + userDeposit + balance_err,
                    userDeposit, rewardTokensBal * 2 + balance_err, user1Balance + userDeposit, 0
                );
                user1Balance += userDeposit;

                await withdrawTokens(user2, userDeposit);
                await checkTokenBalances(
                    userTokenWallet2, user2Data, rewardTokensBal * 2 + balance_err,
                    0, rewardTokensBal * 2 + balance_err, user2Balance + userDeposit, 0
                );
                user2Balance = user2Balance + userDeposit;

                user1_data = await user1Data.call({method: 'rewardRounds'});
                user2_data = await user2Data.call({method: 'rewardRounds'});

                expect(user1_data.length).to.be.equal(4, "Bad user1 data length");
                expect(user2_data.length).to.be.equal(4, "Bad user2 data length");

                const round1_reward = reward_rounds[1].totalReward;

                expect(user1_data[1].reward_balance).to.be.equal(round1_reward.toString(), "Bad user1 round reward");
                expect(user2_data[1].reward_balance).to.be.equal('0', "Bad user2 round reward");

                expect(user1_data[2].reward_balance).to.be.equal(round2_user1_share.toString(), "Bad user1 round reward");
                expect(user2_data[2].reward_balance).to.be.equal(round2_user2_share.toString(), "Bad user2 round reward");
            });

            it("Users claim tokens", async function() {
                let reward_rounds = await stakingRoot.call({method: 'rewardRounds'});

                const user1_reward_data = await user1Data.call({method: 'rewardRounds'});
                const user2_reward_data = await user2Data.call({method: 'rewardRounds'});

                var user1_expected_token_reward = 0, user2_expected_token_reward = 0;
                for (const i of [...Array(reward_rounds.length).keys()]) {
                    const user1_round_reward = user1_reward_data[i].reward_balance;
                    const user2_round_reward = user2_reward_data[i].reward_balance;

                    const user1_token_reward = Math.floor(Math.floor(user1_round_reward * 1e10 / reward_rounds[i].totalReward) * reward_rounds[i].rewardTokens / 1e10);
                    const user2_token_reward = Math.floor(Math.floor(user2_round_reward * 1e10 / reward_rounds[i].totalReward) * reward_rounds[i].rewardTokens / 1e10);

                    user1_expected_token_reward += user1_token_reward;
                    user2_expected_token_reward += user2_token_reward;
                }

                await claimReward(user1);
                await checkTokenBalances(
                    userTokenWallet1, user1Data, rewardTokensBal * 2 - user1_expected_token_reward + balance_err,
                    0, rewardTokensBal * 2 - user1_expected_token_reward + balance_err,
                    user1Balance + user1_expected_token_reward, 0
                );
                user1Balance += user1_expected_token_reward;

                const remaining_balance = rewardTokensBal * 2 + balance_err - user1_expected_token_reward - user2_expected_token_reward;
                await claimReward(user2);
                await checkTokenBalances(
                    userTokenWallet2, user2Data, remaining_balance,
                    0, remaining_balance, user2Balance + user2_expected_token_reward, 0
                );
                user2Balance += user2_expected_token_reward;
                balance_err = remaining_balance;

                const user1_reward_after = await user1Data.call({method: 'rewardRounds'});
                const user2_reward_after = await user2Data.call({method: 'rewardRounds'});
            });
        });

    });
})
