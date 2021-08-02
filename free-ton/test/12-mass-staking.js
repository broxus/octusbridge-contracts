const {
    expect,
} = require('./utils');
const BigNumber = require('bignumber.js');
const logger = require('mocha-logger');
const Account = require("locklift/locklift/contract/account");
const { randomBytes } = require('crypto');

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

let USERS_NUM = 15;

let eth_addrs = [...Array(USERS_NUM).keys()].map(i => `0x${randomBytes(20).toString('hex')}`);

let stakingRoot;
let stakingToken;
let stakingWallet;

let walletFabric;

let users;
let userTokenWallets;
let userDatas;

let stakingOwner;
let ownerWallet;
let userInitialTokenBal = 100000;
let rewardTokensBal = 10000;
let userDeposit = 100;
let rewardPerSec = 1000;


const RELAY_ROUND_TIME_1 = 20;
const ELECTION_TIME = 5;
const TIME_BEFORE_ELECTION = 14;
const RELAYS_COUNT_1 = 150;
const MIN_RELAYS = 10;

const PER_ACTION_WAIT = 500
const BATCH_ACTIOIN_WAIT = 5000;



describe('Test Staking Rewards', async function () {
    this.timeout(10000000);

    const deployTokenRoot = async function (token_name, token_symbol) {
        const RootToken = await locklift.factory.getContract('RootTokenContract', TOKEN_PATH);
        const TokenWallet = await locklift.factory.getContract('TONTokenWallet', TOKEN_PATH);
        const [keyPair] = await locklift.keys.getKeyPairs();

        const _root = await locklift.giver.deployContract({
            contract: RootToken,
            constructorParams: {
                root_public_key_: 0,
                root_owner_address_: walletFabric.address
            },
            initParams: {
                name: stringToBytesArray(token_name),
                symbol: stringToBytesArray(token_symbol),
                decimals: 9,
                wallet_code: TokenWallet.code,
                _randomNonce: getRandomNonce(),
            },
            keyPair
        }, locklift.utils.convertCrystal(15, 'nano'));
        _root.afterRun = afterRun;

        return _root;
    }

    const deployTokenWallets = async function(users) {
        const user_addrs = users.map(i => i.address);
        const slice_len = 50;

        for (const i of [...Array(Math.ceil(users.length / slice_len)).keys()]) {
            const slice = user_addrs.slice(i * slice_len, (i + 1) * slice_len);
            await stakingOwner.runTarget({
                contract: walletFabric,
                method: 'deployTokenWallets',
                params: {
                    token_root: stakingToken.address,
                    owners: slice,
                    amount: userInitialTokenBal
                },
                value: convertCrystal(slice.length * 2.5 + 10, 'nano')
            });
            await wait(PER_ACTION_WAIT);
        }

        await wait(BATCH_ACTIOIN_WAIT);

        return await Promise.all(users.map(async (_user) => {
            const wallet = await getUserTokenWallet(_user);

            const {
                acc_type_name
            } = await locklift.ton.getAccountType(wallet.address);
            expect(acc_type_name).to.be.equal('Active', 'User account not active');

            return wallet;
        }));

    };

    const deployWalletFabric = async function () {
        const [keypair] = await locklift.keys.getKeyPairs();
        const TestWallet = await locklift.factory.getContract('TestWallet');
        const Fabric = await locklift.factory.getAccount('TestWalletFabric');

        let fabric = await locklift.giver.deployContract({
            contract: Fabric,
            constructorParams: {_wallet_code: TestWallet.code},
            initParams: {
                nonce: Math.random() * 6400 | 0,
            },
            keyPair: keypair
        }, convertCrystal(100, 'nano'));
        fabric.setKeyPair(keypair);
        fabric.afterRun = afterRun;
        return fabric;
    }

    const deployAccounts = async function (user, keypairs) {
        let pubkeys = keypairs.map(keypair => `0x${keypair.public}`);
        const slice_len = 50;

        let wallets = [];
        for (const i of [...Array(Math.ceil(keypairs.length / slice_len)).keys()]) {
            const _pubkeys = pubkeys.slice(i * slice_len, (i + 1) * slice_len);
            await user.runTarget({
                contract: walletFabric,
                method: 'deployWallets',
                params: {owners: _pubkeys},
                value: convertCrystal(_pubkeys.length * 10 + 5, 'nano')
            })
            await wait(PER_ACTION_WAIT);

            const {
                value: {wallets: _wallets}
            } = (await walletFabric.getEvents('WalletsCreated')).pop();
            expect(_wallets.length).to.be.eq(_pubkeys.length, 'Did not create wallets');

            wallets = wallets.concat(_wallets);
        }

        return Promise.all(wallets.map(async (addr, idx) => {
            const acc_contract = await locklift.factory.getContract('TestWallet');
            const account = new Account({
                locklift: locklift,
                abi: acc_contract.abi,
                base64: acc_contract.base64,
                code: acc_contract.code,
                name: acc_contract.name
            });
            account.setAddress(addr);
            account.setKeyPair(keypairs[idx]);
            account.afterRun = afterRun;
            return account;
        }));
    }

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

    const getRewardForRelayRound = async function(user, round_num) {
        return await user.runTarget({
            contract: stakingRoot,
            method: 'getRewardForRelayRound',
            params: {
                round_num: round_num,
                send_gas_to: user.address,
            },
            value: locklift.utils.convertCrystal(1.5, 'nano')
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

    const requestRelayMembership = async function (_user) {
        return await _user.runTarget({
            contract: stakingRoot,
            method: 'becomeRelayNextRound',
            params: {
                send_gas_to: _user.address
            },
            value: convertCrystal(1.5, "nano")
        })
    }

    const endElection = async function () {
        return await stakingOwner.runTarget({
            contract: stakingRoot,
            method: 'endElection',
            params: {
                send_gas_to: stakingOwner.address
            },
            value: convertCrystal(7, "nano")
        })
    }

    const confirmTonRelayAccount = async function (_user, _userData) {
        return await _userData.run({
            method: 'confirmTonAccount',
            params: {},
            keyPair: _user.keyPair
        })
    }

    const confirmEthRelayAccount = async function (_user, _user_eth_addr) {
        return await stakingOwner.runTarget({
            contract: stakingRoot,
            method: 'confirmEthAccount',
            params: {
                staker_addr: _user.address,
                eth_address: _user_eth_addr,
                send_gas_to: stakingOwner.address
            },
            value: convertCrystal(0.7, "nano")
        })
    }

    const linkRelayAccounts = async function (_user, ton_pk, eth_addr) {
        const user_pk = new BigNumber(ton_pk, 16);
        const user_eth = new BigNumber(eth_addr.toLowerCase(), 16);

        const input_params = {
            ton_pubkey: user_pk.toFixed(),
            eth_address: user_eth.toFixed(),
            send_gas_to: _user.address
        }

        return await _user.runTarget({
            contract: stakingRoot,
            method: 'linkRelayAccounts',
            params: input_params,
            value: convertCrystal(5.1, "nano")
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
            value: convertCrystal(2.5, 'nano')
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

    const showNode = async function(election, idx) {
        const node = await election.call({method: 'getNode', params: {idx: idx}});
        return {
            prev_node: node.prev_node.toString(),
            next_node: node.next_node.toString(),
            staker_addr: node.request.staker_addr,
            staked_tokens: node.request.staked_tokens.toString()
        }
    }

    describe('Setup contracts', async function() {
        describe('Users', async function() {
            it('Deploy wallet fabric', async function() {
                walletFabric = await deployWalletFabric();
                logger.log(`Wallet fabric address - ${walletFabric.address}`);
            });

            it('Deploy users wallets', async function() {
                let keys = await locklift.keys.getKeyPairs();
                const owner_key = keys[0];
                const user_keys = keys.slice(1, USERS_NUM + 1);

                stakingOwner = await deployAccount(owner_key, 5000);
                users = await deployAccounts(stakingOwner, user_keys);
            });
        });

        describe('Token', async function() {
            it('Deploy root', async function() {
                stakingToken = await deployTokenRoot('Farm token', 'FT');
            });

            it('Deploy users token wallets', async function() {
                [ownerWallet] = await deployTokenWallets([stakingOwner]);
                userTokenWallets = await deployTokenWallets(users);

                const owner_balance = await ownerWallet.call({method: 'balance'});
                expect(owner_balance.toString()).to.be.equal(userInitialTokenBal.toString());

                await Promise.all(userTokenWallets.map(async (userWallet) => {
                    const balance = await userWallet.call({method: 'balance'});
                    expect(balance.toString()).to.be.equal(userInitialTokenBal.toString());
                }));
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
                        _bridge: stakingOwner.address
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

                const tx = await depositTokens(stakingOwner, ownerWallet, amount, true);

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
                        election_time: ELECTION_TIME,
                        time_before_election: TIME_BEFORE_ELECTION,
                        relays_count: RELAYS_COUNT_1,
                        min_relays_count: MIN_RELAYS,
                        send_gas_to: stakingOwner.address
                    },
                });

                const relays_count = await stakingRoot.call({method: 'relaysCount'});
                expect(relays_count.toString()).to.be.equal(RELAYS_COUNT_1.toString(), "Relay config not installed");
            })
        });
    });

    describe('Relay pipeline testing', async function () {
        describe('Standard case', async function() {
            it('Users deposit tokens', async function () {
                let _user_data = [];
                for (const i of [...Array(users.length).keys()]) {
                    const user_token_wallet = userTokenWallets[i];
                    const user = users[i];

                    const curUserDeposit = userDeposit + i;
                    await depositTokens(user, user_token_wallet, curUserDeposit);
                    await wait(PER_ACTION_WAIT);

                    const user_data = await getUserDataAccount(user);

                    const user_data_bal = await user_data.call({method: 'token_balance'});
                    const user_bal = await user_token_wallet.call({method: 'balance'});

                    const expected_user_bal = userInitialTokenBal - curUserDeposit;
                    expect(user_data_bal.toString()).to.be.equal(curUserDeposit.toString(), `Bad deposit1 - user ${user.address}, idx - ${i}`);
                    expect(user_bal.toString()).to.be.equal(expected_user_bal.toString(), `Bad deposit2 - user ${user.address}, idx - ${i}`);
                    _user_data.push(user_data);
                }

                userDatas = _user_data;
            });

            it("Creating origin relay round", async function () {
                let _ton_pubkeys = [];
                let _eth_addrs = [];
                [...Array(users.length).keys()].map((i) => {
                    const user_pk = new BigNumber(users[i].keyPair.public, 16);
                    const user_eth = new BigNumber(eth_addrs[i].toLowerCase(), 16);
                    _ton_pubkeys.push(user_pk.toFixed(0));
                    _eth_addrs.push(user_eth.toFixed(0));
                });

                const input_params = {
                    staker_addrs: users.map(i => i.address),
                    ton_pubkeys: _ton_pubkeys,
                    eth_addrs: _eth_addrs,
                    staked_tokens: users.map(i => 1),
                    send_gas_to: stakingOwner.address
                }

                const reward_rounds = await stakingRoot.call({method: 'rewardRounds'});

                const tx = await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'createOriginRelayRound',
                    params: input_params,
                    value: convertCrystal(3.1, 'nano')
                });

                const round = await getRelayRound(1);
                const total_tokens_staked = await round.call({method: 'total_tokens_staked'});
                const round_reward = await round.call({method: 'round_reward'});
                const relays_count = await round.call({method: 'relays_count'});
                const reward_round_num = await round.call({method: 'reward_round_num'});

                const _round_reward = RELAY_ROUND_TIME_1 * rewardPerSec;
                expect(total_tokens_staked.toString()).to.be.equal(USERS_NUM.toString(), "Bad relay round");
                expect(round_reward.toString()).to.be.equal(_round_reward.toString(), "Bad relay round");
                expect(relays_count.toString()).to.be.equal(USERS_NUM.toString(), "Bad relay round");
                expect(reward_round_num.toString()).to.be.equal('0', "Bad relay round");

                const cur_relay_round = await stakingRoot.call({method: 'currentRelayRound'});
                expect(cur_relay_round.toString()).to.be.equal('1', "Bad round installed in root");

                const reward_rounds_new = await stakingRoot.call({method: 'rewardRounds'});
                const expected_reward = round_reward.plus(new BigNumber(reward_rounds[0].totalReward));
                expect(expected_reward.toString()).to.be.equal(reward_rounds_new[0].totalReward.toString(), "Bad reward after relay round init");

                const {
                    value: {
                        round_num: _round_num,
                        round_start_time: _round_start_time,
                        round_addr: _round_addr,
                        relays_count: _relays_count,
                        duplicate: _duplicate
                    }
                } = (await stakingRoot.getEvents('RelayRoundInitialized')).pop();

                expect(_round_num.toString()).to.be.equal('1', "Bad event");
                expect(_round_addr).to.be.equal(round.address, "Bad event");

                expect(_relays_count.toString()).to.be.equal(USERS_NUM.toString(), "Relay creation fail - relays count");
                expect(_duplicate).to.be.equal(false, "Relay creation fail - duplicate");

                await Promise.all(users.map(async (user, idx) => {
                    const relay = await round.call({
                        method: 'getRelayByStakerAddress',
                        params: {staker_addr: user.address}
                    });

                    const user_pk = new BigNumber(users[idx].keyPair.public, 16);
                    const user_eth = new BigNumber(eth_addrs[idx].toLowerCase(), 16);

                    expect(relay.staker_addr).to.be.equal(user.address, "Relay creation fail - staker addr");
                    expect(relay.ton_pubkey.toString(16)).to.be.equal(user_pk.toString(16), "Relay creation fail - ton pubkey");
                    expect(relay.eth_addr.toString(16)).to.be.equal(user_eth.toString(16), "Relay creation fail - eth addr");
                    expect(relay.staked_tokens.toString()).to.be.equal('1', "Relay creation fail - staked tokens");
                }));

                const origin_initialized = await stakingRoot.call({method: 'originRelayRoundInitialized'});
                expect(origin_initialized).to.be.equal(true, "Origin round not initialized");
            });

            it("Users link relay accounts", async function () {
                for (const i of [...Array(USERS_NUM).keys()]) {
                    const user = users[i];

                    await linkRelayAccounts(user, user.keyPair.public, eth_addrs[i]);
                    await wait(PER_ACTION_WAIT);

                    const userData = userDatas[i];
                    const _user_pk = await userData.call({method: 'relay_ton_pubkey'});
                    const _user_eth_addr = await userData.call({method: 'relay_eth_address'});

                    const user_pk_expected = new BigNumber(user.keyPair.public, 16);
                    const user_eth_addr_expected = new BigNumber(eth_addrs[i].toLowerCase(), 16);

                    expect(_user_pk.toString(16)).to.be.equal(user_pk_expected.toString(16), "Bad ton pubkey installed");
                    expect(_user_eth_addr.toString(16)).to.be.equal(user_eth_addr_expected.toString(16), "Bad eth addr installed");
                }
            });

            it("Users confirm ton relay accounts", async function () {
                for (const i of [...Array(USERS_NUM).keys()]) {
                    const user = users[i];
                    const userData = userDatas[i];

                    await confirmTonRelayAccount(user, userData);
                    await wait(PER_ACTION_WAIT);

                    const confirmed_user = await userData.call({method: 'ton_pubkey_confirmed'});
                    expect(confirmed_user).to.be.equal(true, "Ton pubkey user not confirmed");
                }
            })

            it("Users confirm eth relay accounts", async function () {
                for (const i of [...Array(USERS_NUM).keys()]) {
                    const user = users[i];
                    const eth_addr = eth_addrs[i];
                    const userData = userDatas[i];

                    await confirmEthRelayAccount(user, eth_addr);
                    await wait(PER_ACTION_WAIT);

                    const confirmed_user = await userData.call({method: 'eth_address_confirmed'});
                    expect(confirmed_user).to.be.equal(true, "Eth pubkey user not confirmed");
                }
            })

            it("Election on new round starts", async function () {
                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'startElectionOnNewRound',
                    params: {send_gas_to: stakingOwner.address},
                    value: convertCrystal(1.6, 'nano')
                });

                const election = await getElection(2);

                const round_num = await election.call({method: 'round_num'});
                expect(round_num.toString()).to.be.equal('2', "Bad election - round num");

                const {
                    value: {
                        round_num: _round_num,
                        election_start_time: _election_start_time,
                        election_addr: _election_addr,
                    }
                } = (await stakingRoot.getEvents('ElectionStarted')).pop();

                logger.log(`Election addr - ${_election_addr}`);
                expect(_round_num.toString()).to.be.equal('2', "Bad election - round num");
                expect(_election_addr).to.be.equal(election.address, "Bad election - address");
            })

            it("Users request relay membership", async function () {
                const election = await getElection(2);

                for (const i of [...Array(USERS_NUM).keys()].reverse()) {
                    const user = users[i];
                    const userData = userDatas[i];

                    const user_pk = new BigNumber(user.keyPair.public, 16);
                    const user_eth_addr = new BigNumber(eth_addrs[i].toLowerCase(), 16);

                    const tx = await requestRelayMembership(user);
                    await wait(PER_ACTION_WAIT);
                    console.log(tx.transaction.out_msgs);

                    const {
                        value: {
                            round_num: _round_num,
                            tokens: _tokens,
                            ton_pubkey: _ton_pubkey,
                            eth_address: _eth_address,
                            lock_until: _lock_until
                        }
                    } = (await userData.getEvents('RelayMembershipRequested')).pop();
                    console.log(`Requested for ${i}`);

                    const user_token_balance = await userData.call({method: 'token_balance'});

                    const expected_ton_pubkey = `0x${user_pk.toString(16).padStart(64, '0')}`;
                    const expected_eth_addr = `0x${user_eth_addr.toString(16).padStart(64, '0')}`
                    const block_now = tx.transaction.now + 30 * 24 * 60 * 60;

                    expect(_round_num.toString()).to.be.equal('2', 'Bad event - round num');
                    expect(_tokens.toString()).to.be.equal(user_token_balance.toString(), "Bad event - tokens");
                    expect(_ton_pubkey.toString()).to.be.equal(expected_ton_pubkey, "Bad event - ton pubkey");
                    expect(_eth_address.toString(16)).to.be.equal(expected_eth_addr, "Bad event - eth address");
                    expect(Number(_lock_until)).to.be.gte(Number(block_now), "Bad event - lock");
                }


                // now check requests sorted correctly
                const requests = await election.call({method: 'getRequests', params: {limit: USERS_NUM}});
                for (const i of [...Array(USERS_NUM).keys()]) {
                    const req = requests[i];
                    const user = users[USERS_NUM - i - 1];
                    const userData = userDatas[USERS_NUM - i - 1];
                    const user_pk = new BigNumber(user.keyPair.public, 16);

                    const user_token_balance = await userData.call({method: 'token_balance'});
                    const expected_ton_pubkey = `0x${user_pk.toString(16).padStart(64, '0')}`;

                    expect(req.staker_addr).to.be.equal(user.address, "Bad request - staker addr");
                    expect(req.staked_tokens.toString()).to.be.equal(user_token_balance.toString(), "Bad request - token balance");
                    expect(req.ton_pubkey).to.be.equal(expected_ton_pubkey, "Bad request - ton pubkey");
                }
            });

            it("Election ends, new round initialized", async function () {
                const reward_rounds = await stakingRoot.call({method: 'rewardRounds'});

                const tx = await endElection();
                console.log(tx.transaction.out_msgs);

                const round = await getRelayRound(2);
                // const election = await getElection(2);

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

                expect(_round_num.toString()).to.be.equal('2', "Bad election event - round num");
                expect(_relay_requests.toString()).to.be.equal(USERS_NUM.toString(), "Bad election event - relay requests");
                expect(_min_relays_ok).to.be.equal(true, "Bad election event - min relays");

                const {
                    value: {
                        round_num: _round_num1,
                        round_start_time: _round_start_time,
                        round_addr: _round_addr,
                        relays_count: _relays_count,
                        duplicate: _duplicate
                    }
                } = (await stakingRoot.getEvents('RelayRoundInitialized')).pop();

                expect(_round_num1.toString()).to.be.equal('2', "Bad relay init event - round num");
                expect(_round_addr.toString()).to.be.equal(round.address, "Bad relay init event - round addr");
                expect(_relays_count.toString()).to.be.equal(USERS_NUM.toString(), "Bad relay init event - relays count");
                expect(_duplicate).to.be.equal(false, "Bad relay init event - duplicate");

                const stored_round_num = await round.call({method: 'round_num'});
                const stored_relays_count = await round.call({method: 'relays_count'});
                const stored_reward_round_num = await round.call({method: 'reward_round_num'});
                const stored_relays_installed = await round.call({method: 'relays_installed'});
                const stored_duplicate = await round.call({method: 'duplicate'});

                expect(stored_round_num.toString()).to.be.equal('2', "Bad round created - round num");
                expect(stored_relays_count.toString()).to.be.equal(USERS_NUM.toString(), "Bad round created - relays count");
                expect(stored_reward_round_num.toString()).to.be.equal('0', "Bad round created - reward round num");
                expect(stored_relays_installed).to.be.equal(true, "Bad round created - relays installed");
                expect(stored_duplicate).to.be.equal(false, "Bad round created - duplicate");

                const round_reward = await round.call({method: 'round_reward'});
                const reward_rounds_new = await stakingRoot.call({method: 'rewardRounds'});
                const expected_reward = round_reward.plus(new BigNumber(reward_rounds[0].totalReward));
                expect(expected_reward.toString()).to.be.equal(reward_rounds_new[0].totalReward.toString(), "Bad reward after relay round init");

                const cur_relay_round = await stakingRoot.call({method: 'currentRelayRound'});
                expect(cur_relay_round.toString()).to.be.equal('2', "Bad round installed in root");

                // check all relays are installed
                const relays = await round.call({method: 'getRelayList', params: {count: USERS_NUM}});
                const rel_addrs = relays.map((elem) => elem.staker_addr);

                users.map((user) => {
                    expect(rel_addrs.includes(user.address)).to.be.true;
                });
            });
        });

        describe.skip("Not enough relay requests on election", async function() {
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

            it("Election on new round starts", async function () {
                await wait(5000);

                await user2.runTarget({
                    contract: stakingRoot,
                    method: 'startElectionOnNewRound',
                    params: {send_gas_to: user2.address},
                    value: convertCrystal(1.6, 'nano')
                });

                const election = await getElection(3);

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

            it("Users request relay membership", async function() {
                const tx = await requestRelayMembership(user1);

                const { value: {
                    round_num: _round_num1,
                    tokens: _tokens1,
                    ton_pubkey: _ton_pubkey1,
                    eth_address: _eth_address1,
                    lock_until: _lock_until1
                } } = (await user1Data.getEvents('RelayMembershipRequested')).pop();

                const user1_token_balance = await user1Data.call({method: 'token_balance'});

                const user1_pk = new BigNumber(user1.keyPair.public, 16);
                const expected_ton_pubkey1 = `0x${user1_pk.toString(16).padStart(64, '0')}`;
                const user1_eth = new BigNumber(user1_eth_addr.toLowerCase(), 16);
                const block_now = tx.transaction.now + 30 * 24 * 60 * 60;

                const expected_eth_addr = `0x${user1_eth.toString(16).padStart(64, '0')}`
                expect(_round_num1.toString()).to.be.equal('3', 'Bad event - round num');
                expect(_tokens1.toString()).to.be.equal(user1_token_balance.toString(), "Bad event - tokens");
                expect(_ton_pubkey1.toString()).to.be.equal(expected_ton_pubkey1, "Bad event - ton pubkey");
                expect(_eth_address1.toString(16)).to.be.equal(expected_eth_addr, "Bad event - eth address");
                expect(Number(_lock_until1)).to.be.gte(Number(block_now), "Bad event - lock");
            });

            it("Election ends, not enough users participated, clone prev. round", async function() {
                await wait(3500);

                const reward_rounds = await stakingRoot.call({method: 'rewardRounds'});

                const tx = await endElection();
                // console.log(tx.transaction.out_msgs);

                const round = await getRelayRound(3);
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
                expect(_relay_requests.toString()).to.be.equal('1', "Bad election event - relay requests");
                expect(_min_relays_ok).to.be.equal(false, "Bad election event - min relays");

                const { value: {
                    round_num: _round_num1,
                    round_start_time: _round_start_time,
                    round_addr: _round_addr,
                    relays_count: _relays_count,
                    duplicate: _duplicate
                } } = (await stakingRoot.getEvents('RelayRoundInitialized')).pop();

                expect(_round_num1.toString()).to.be.equal('3', "Bad relay init event - round num");
                expect(_round_addr.toString()).to.be.equal(round.address, "Bad relay init event - round addr");
                expect(_relays_count.toString()).to.be.equal('3', "Bad relay init event - relays count");
                expect(_duplicate).to.be.equal(true, "Bad relay init event - duplicate");

                const stored_round_num = await round.call({method: 'round_num'});
                const stored_relays_count = await round.call({method: 'relays_count'});
                const stored_total_tokens_staked = await round.call({method: 'total_tokens_staked'});
                const stored_reward_round_num = await round.call({method: 'reward_round_num'});
                const stored_relays_installed = await round.call({method: 'relays_installed'});
                const stored_duplicate = await round.call({method: 'duplicate'});

                const expected_staked_tokens = userDeposit * 6;

                expect(stored_round_num.toString()).to.be.equal('3', "Bad round created - round num");
                expect(stored_relays_count.toString()).to.be.equal('3', "Bad round created - relays count");
                expect(stored_total_tokens_staked.toString(16)).to.be.equal(expected_staked_tokens.toString(16), "Bad round created - total tokens staked");
                expect(stored_reward_round_num.toString()).to.be.equal('1', "Bad round created - reward round num");
                expect(stored_relays_installed).to.be.equal(true, "Bad round created - relays installed");
                expect(stored_duplicate).to.be.equal(true, "Bad round created - duplicate");

                const round_reward = await round.call({method: 'round_reward'});
                const reward_rounds_new = await stakingRoot.call({method: 'rewardRounds'});
                // console.log(reward_rounds, reward_rounds_new, round_reward.toString());
                const expected_reward = round_reward.plus(new BigNumber(reward_rounds[1].totalReward));
                expect(expected_reward.toString()).to.be.equal(reward_rounds_new[1].totalReward.toString(), "Bad reward after relay round init");

                const cur_relay_round = await stakingRoot.call({method: 'currentRelayRound'});
                expect(cur_relay_round.toString()).to.be.equal('3', "Bad round installed in root");

                // check all relays are installed
                const relays = await round.call({method: 'getRelayList', params: {count: 10}});
                const rel_addrs = relays.map((elem) => elem.staker_addr);
                expect(rel_addrs.includes(user1.address)).to.be.true;
                expect(rel_addrs.includes(user2.address)).to.be.true;
                expect(rel_addrs.includes(user3.address)).to.be.true;
            });

            it("Users get reward for prev relay round", async function() {
                await wait(1000);

                for (const i of [
                    [user1, userTokenWallet1, user1Data], [user2, userTokenWallet2, user2Data], [user3, userTokenWallet3, user3Data]
                ]) {
                    const [_user, _userTokenWallet, _userData] = i;

                    const relay_round = await getRelayRound(2);
                    const relay = await relay_round.call(
                        {method: 'getRelayByStakerAddress', params: {staker_addr: _user.address}}
                    );
                    const staked_tokens = new BigNumber(relay.staked_tokens.toString());
                    const total_tokens_staked = await relay_round.call({method: 'total_tokens_staked'});

                    // deposit 1 token to sync rewards
                    await depositTokens(_user, _userTokenWallet, 1);
                    const _user_rewards = await _userData.call({method: 'rewardRounds'});

                    await getRewardForRelayRound(_user, 2);
                    const _user_rewards_1 = await _userData.call({method: 'rewardRounds'});

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
                    expect(_relay_round_num.toString()).to.be.equal('2', "Bad relay round reward event - relay round");
                    expect(_reward_round_num.toString()).to.be.equal('0', "Bad relay round reward event - reward round");
                    expect(_reward.toString()).to.be.equal(expected_reward.toString(), "Bad relay round reward event - reward");
                }
            });
        });

    });
})
