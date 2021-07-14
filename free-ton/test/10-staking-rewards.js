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

const afterRun = async (tx) => {
    await new Promise(resolve => setTimeout(resolve, 500));
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));


const bridge = '0:9cc3d8668d57d387eae54c4398a1a0b478b6a8c3a0f2b5265e641a212b435231'

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
let userInitialTokenBal = 10000;
let rewardTokensBal = 10000;
let userDeposit = 100;
let rewardPerSec = 1000;


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

        expect(_pool_wallet_bal.toNumber()).to.be.equal(pool_wallet_bal, 'Pool wallet balance bad');
        expect(_pool_bal.toNumber()).to.be.equal(pool_bal, 'Pool balance bad');
        expect(_pool_reward_bal.toNumber()).to.be.equal(pool_reward_bal, 'Pool reward balance bad');
        expect(_user_bal.toNumber()).to.be.equal(user_bal, 'User balance bad');
        expect(_user_data_bal.toNumber()).to.be.equal(user_data_bal, 'User data balance bad');
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
        });
    });

    describe('Basic staking pipeline', async function () {
        describe('1 user farming', async function () {
            it('Deposit tokens', async function() {
                await depositTokens(user1, userTokenWallet1, userDeposit);
                user1Data = await getUserDataAccount(user1);

                await checkTokenBalances(
                    userTokenWallet1, user1Data, rewardTokensBal + userDeposit,
                    userDeposit, rewardTokensBal, userInitialTokenBal - userDeposit, userDeposit
                );

                const { value: { user: _user, amount: _amount } } = (await stakingRoot.getEvents('Deposit')).pop();
                expect(_user).to.be.equal(user1.address, 'Bad event');
                expect(_amount).to.be.equal(userDeposit.toString(), 'Bad event');
            });

            it('Deposit 2nd time', async function() {
                const prev_reward_time = await stakingRoot.call({method: 'lastRewardTime'});
                const user1_rew_before = await user1Data.call({method: 'rewardRounds'});

                await depositTokens(user1, userTokenWallet1, userDeposit);

                await checkTokenBalances(
                    userTokenWallet1, user1Data, rewardTokensBal + userDeposit * 2,
                    userDeposit * 2, rewardTokensBal, userInitialTokenBal - userDeposit * 2, userDeposit * 2
                );

                const new_reward_time = await stakingRoot.call({method: 'lastRewardTime'})
                await checkReward(user1Data, user1_rew_before, prev_reward_time, new_reward_time);

                const { value: { user: _user, amount: _amount } } = (await stakingRoot.getEvents('Deposit')).pop();
                expect(_user).to.be.equal(user1.address, 'Bad event');
                expect(_amount).to.be.equal(userDeposit.toString(), 'Bad event');
            });

            it('User withdraw half of staked amount', async function() {
                const prev_reward_time = await stakingRoot.call({method: 'lastRewardTime'});
                const user1_rew_before = await user1Data.call({method: 'rewardRounds'});

                await withdrawTokens(user1, userDeposit);
                await checkTokenBalances(
                    userTokenWallet1, user1Data, rewardTokensBal + userDeposit,
                    userDeposit, rewardTokensBal, userInitialTokenBal - userDeposit, userDeposit
                );

                const new_reward_time = await stakingRoot.call({method: 'lastRewardTime'})
                await checkReward(user1Data, user1_rew_before, prev_reward_time, new_reward_time);

                const { value: { user: _user, amount: _amount } } = (await stakingRoot.getEvents('Withdraw')).pop();
                expect(_user).to.be.equal(user1.address, 'Bad event');
                expect(_amount).to.be.equal(userDeposit.toString(), 'Bad event');
            });

            it('User withdraw other half', async function() {
                const prev_reward_time = await stakingRoot.call({method: 'lastRewardTime'});
                const user1_rew_before = await user1Data.call({method: 'rewardRounds'});

                await withdrawTokens(user1, userDeposit);

                const new_reward_time = await stakingRoot.call({method: 'lastRewardTime'})
                await checkReward(user1Data, user1_rew_before, prev_reward_time, new_reward_time);

                await checkTokenBalances(
                    userTokenWallet1, user1Data, rewardTokensBal,
                    0, rewardTokensBal, userInitialTokenBal, 0
                );
                const { value: { user: _user, amount: _amount } } = (await stakingRoot.getEvents('Withdraw')).pop();
                expect(_user).to.be.equal(user1.address, 'Bad event');
                expect(_amount).to.be.equal(userDeposit.toString(), 'Bad event');
            });
        });

        describe('Multiple users farming', async function() {
            let user1_deposit_time;
            let user2_deposit_time;
            let user1_withdraw_time;
            let user2_withdraw_time;

            it('Users deposit tokens', async function() {
                await depositTokens(user1, userTokenWallet1, userDeposit);
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

            it('Users withdraw tokens', async function() {
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
        });

    });
})
