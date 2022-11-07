const {
    expect,
} = require('../utils');
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
    await new Promise(resolve => setTimeout(resolve, 1));
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));


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

const MIN_RELAY_DEPOSIT = 1;
const RELAY_ROUND_TIME_1 = 20;
const ELECTION_TIME = 5;
const TIME_BEFORE_ELECTION = 14;
const RELAYS_COUNT_1 = 150;
const MIN_RELAYS = 2;
const USERS_NUM = 5;
const RELAY_INITIAL_DEPOSIT = 50;


const eth_addrs = [...Array(USERS_NUM).keys()].map(i => `0x${randomBytes(20).toString('hex')}`);

const PER_ACTION_WAIT = 1000
const BATCH_ACTION_WAIT = 5000;
const DEV_WAIT = 60000;
let staking_events = [{name: 'dummy'}];



describe.skip('Staking highload relay test', async function () {
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

        await wait(BATCH_ACTION_WAIT);
        if (locklift.network === 'dev') {
            await wait(DEV_WAIT);
        }

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
        const user_bal = RELAY_INITIAL_DEPOSIT + 10;
        for (const i of [...Array(Math.ceil(keypairs.length / slice_len)).keys()]) {
            const _pubkeys = pubkeys.slice(i * slice_len, (i + 1) * slice_len);
            await user.runTarget({
                contract: walletFabric,
                method: 'deployWallets',
                params: {owners: _pubkeys, initial_balance: (convertCrystal((RELAY_INITIAL_DEPOSIT + 10), 'nano')).toString()},
                value: convertCrystal(_pubkeys.length * user_bal + 5, 'nano')
            })
            await wait(PER_ACTION_WAIT);
            if (locklift.network === 'dev') {
                await wait(DEV_WAIT);
            }

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

    const getBalance = async function (address) {
        return await locklift.ton.client.net.wait_for_collection({
            collection: 'accounts',
            filter: {
                id: { eq: address },
                balance: { gt: `0x0` }
            },
            result: 'balance',
            timeout: 120000
        });
    }

    const waitForDeploy = async function (address) {
        return await getBalance(address);
    }

    const listenStakingEvents = async function () {
        const subscription = await locklift.ton.client.net.subscribe_collection({
            collection: 'messages',
            filter: {
                src: {eq: stakingRoot.address},
                msg_type: {eq: 2}
            },
            result: 'id body src'
        }, async (msg) => {
            const [decoded] = await stakingRoot.decodeMessages([msg.result], false);
            logger.log(`Received ${decoded.name}`)
            staking_events.push(decoded);
        })
    }

    const waitForStakingEvent = async function (name, timeout=60000) {
        let sleep_time = 0;
        let id_to_del;
        let event;
        while (sleep_time < timeout) {
            id_to_del = staking_events.findIndex((elem, id, arr) => elem.name === name);
            if (id_to_del !== -1) {
                break;
            }
            await wait(100);
            sleep_time += 100;
        }
        if (id_to_del === -1) {
            logger.log(`Got timeout waiting for ${name}`);
        } else {
            const [_event] = staking_events.splice(id_to_del, 1);
            event = _event;
            logger.log(`Event emitted - ${name}`);
        }
        return event.value;
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

    const getRelayRound = async function (round_num) {
        const addr = await stakingRoot.call({
            method: 'getRelayRoundAddress',
            params: {round_num: round_num}
        });
        const round = await locklift.factory.getContract('RelayRound');
        round.setAddress(addr);
        return round;
    }

    const requestRelayMembership = async function (_user, _userData) {
        return await _userData.run({
            method: 'becomeRelayNextRound',
            params: {},
            keyPair: _user.keyPair
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

                stakingOwner = await deployAccount(owner_key, 3000);
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
                    initParams: {nonce: getRandomNonce()},
                    keyPair: keyPair,
                }, locklift.utils.convertCrystal(10, 'nano'));

                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

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
                        _bridge: stakingOwner.address,
                        _deploy_nonce: getRandomNonce()
                    }
                })).decoded.output.value0)
                logger.log(`StakingRoot address: ${stakingRoot.address}`);
                logger.log(`StakingRoot owner address: ${stakingOwner.address}`);
                logger.log(`StakingRoot token root address: ${stakingToken.address}`);

                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

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
                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }
                const active = await stakingRoot.call({method: 'isActive'});
                expect(active).to.be.equal(true, "Staking not active");
            });

            it('Sending reward tokens to staking', async function() {
                const amount = rewardTokensBal;

                const tx = await depositTokens(stakingOwner, ownerWallet, amount, true);

                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const staking_balance = await stakingWallet.call({method: 'balance'});
                const staking_balance_stored = await stakingRoot.call({method: 'rewardTokenBalance'});

                expect(staking_balance.toString()).to.be.equal(amount.toString(), 'Farm pool balance empty');
                expect(staking_balance_stored.toString()).to.be.equal(amount.toString(), 'Farm pool balance not recognized');
            });

            it("Setting relay config for testing", async function() {
                await listenStakingEvents();
                // super minimal relay config for local testing
                const init_deposit = convertCrystal(RELAY_INITIAL_DEPOSIT, 'nano');
                await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'setRelayConfig',
                    params: {
                        relay_round_time: RELAY_ROUND_TIME_1,
                        election_time: ELECTION_TIME,
                        time_before_election: TIME_BEFORE_ELECTION,
                        relays_count: RELAYS_COUNT_1,
                        min_relays_count: MIN_RELAYS,
                        min_relay_deposit: MIN_RELAY_DEPOSIT,
                        relay_initial_deposit: init_deposit.toString(),
                        send_gas_to: stakingOwner.address
                    },
                });

                await waitForStakingEvent('RelayConfigUpdated');

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
            it('Users deposit tokens', async function () {
                let _user_data = [];

                for (const i of [...Array(users.length).keys()]) {
                    const user_token_wallet = userTokenWallets[i];
                    const user = users[i];

                    const curUserDeposit = userDeposit + i;
                    await depositTokens(user, user_token_wallet, curUserDeposit);
                    await wait(PER_ACTION_WAIT);

                    if (locklift.network === 'dev') {
                        await wait(DEV_WAIT);
                    }

                    const user_data = await getUserDataAccount(user);

                    const user_data_bal = await user_data.call({method: 'token_balance'});
                    const user_bal = await user_token_wallet.call({method: 'balance'});

                    const expected_user_bal = userInitialTokenBal - curUserDeposit;
                    expect(user_data_bal.toFixed(0)).to.be.equal(curUserDeposit.toFixed(0), `Bad deposit1 - user ${user.address}, idx - ${i}`);
                    expect(user_bal.toFixed(0)).to.be.equal(expected_user_bal.toFixed(0), `Bad deposit2 - user ${user.address}, idx - ${i}`);
                    _user_data.push(user_data);
                }

                userDatas = _user_data;
            });

            it("Creating origin relay round", async function () {
                const ORIGIN_USERS_NUM = 50;
                const origin_users = users.slice(0, ORIGIN_USERS_NUM);

                let _ton_pubkeys = [];
                let _eth_addrs = [];
                [...Array(origin_users.length).keys()].map((i) => {
                    const user_pk = new BigNumber(users[i].keyPair.public, 16);
                    const user_eth = new BigNumber(eth_addrs[i].toLowerCase(), 16);
                    _ton_pubkeys.push(user_pk.toFixed(0));
                    _eth_addrs.push(user_eth.toFixed(0));
                });

                const input_params = {
                    staker_addrs: origin_users.map(i => i.address),
                    ton_pubkeys: _ton_pubkeys,
                    eth_addrs: _eth_addrs,
                    staked_tokens: origin_users.map(i => 1),
                    send_gas_to: stakingOwner.address
                }

                const reward_rounds = await stakingRoot.call({method: 'rewardRounds'});

                const tx = await stakingOwner.runTarget({
                    contract: stakingRoot,
                    method: 'createOriginRelayRound',
                    params: input_params,
                    value: convertCrystal(6, 'nano')
                });
                console.log(tx.out_msgs);
                const event = await waitForStakingEvent('RelayRoundInitialized');

                const round = await getRelayRound(1);
                await waitForDeploy(round.address);

                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                expect(event).not.to.be.eq(undefined, "Event not emitted");

                const total_tokens_staked = await round.call({method: 'total_tokens_staked'});
                const round_reward = await round.call({method: 'round_reward'});
                const relays_count = await round.call({method: 'relays_count'});
                const reward_round_num = await round.call({method: 'reward_round_num'});

                const _round_reward = RELAY_ROUND_TIME_1 * rewardPerSec;
                expect(total_tokens_staked.toString()).to.be.equal(origin_users.length.toString(), "Bad relay round");
                expect(round_reward.toString()).to.be.equal(_round_reward.toString(), "Bad relay round");
                expect(relays_count.toString()).to.be.equal(origin_users.length.toString(), "Bad relay round");
                expect(reward_round_num.toString()).to.be.equal('0', "Bad relay round");

                const relay_rounds_data_0 = await stakingRoot.call({method: 'getRelayRoundsDetails'});
                expect(relay_rounds_data_0.currentRelayRound.toString()).to.be.equal('1', "Bad round installed in root");

                const reward_rounds_new = await stakingRoot.call({method: 'rewardRounds'});
                const expected_reward = round_reward.plus(new BigNumber(reward_rounds[0].totalReward));
                expect(expected_reward.toString()).to.be.equal(reward_rounds_new[0].totalReward.toString(), "Bad reward after relay round init");

                const {
                    round_num: _round_num,
                    round_start_time: _round_start_time,
                    round_addr: _round_addr,
                    relays_count: _relays_count,
                    duplicate: _duplicate
                } = event;

                expect(_round_num.toString()).to.be.equal('1', "Bad event");
                expect(_round_addr).to.be.equal(round.address, "Bad event");

                expect(_relays_count.toString()).to.be.equal(origin_users.length.toString(), "Relay creation fail - relays count");
                expect(_duplicate).to.be.equal(false, "Relay creation fail - duplicate");

                await Promise.all(origin_users.map(async (user, idx) => {
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

                const relay_rounds_data = await stakingRoot.call({method: 'getRelayRoundsDetails'});
                expect(relay_rounds_data.originRelayRoundInitialized).to.be.equal(true, "Origin round not initialized");
            });

            it("Users link relay accounts", async function () {
                for (const i of [...Array(USERS_NUM).keys()]) {
                    const user = users[i];

                    await linkRelayAccounts(user, user.keyPair.public, eth_addrs[i]);
                    await wait(PER_ACTION_WAIT);

                    if (locklift.network === 'dev') {
                        await wait(DEV_WAIT);
                    }

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

                    if (locklift.network === 'dev') {
                        await wait(DEV_WAIT);
                    }

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

                    if (locklift.network === 'dev') {
                        await wait(DEV_WAIT);
                    }

                    const confirmed_user = await userData.call({method: 'eth_address_confirmed'});
                    expect(confirmed_user).to.be.equal(true, "Eth pubkey user not confirmed");
                }
            })

            it("Election on new round starts", async function () {
                const tx = await startElection(users[0]);
                console.log(tx.out_msgs);
                const event = await waitForStakingEvent('ElectionStarted');

                const election = await getElection(2);
                await waitForDeploy(election.address);

                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                expect(event).not.to.be.eq(undefined, "Event not emitted");

                const round_num = await election.call({method: 'round_num'});
                expect(round_num.toString()).to.be.equal('2', "Bad election - round num");

                const {
                    round_num: _round_num,
                    election_start_time: _election_start_time,
                    election_addr: _election_addr,
                } = event;

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

                    const tx = await requestRelayMembership(user, userData);
                    await wait(PER_ACTION_WAIT);

                    if (locklift.network === 'dev') {
                        await wait(DEV_WAIT);
                    }

                    const {
                        value: {
                            round_num: _round_num,
                            tokens: _tokens,
                            ton_pubkey: _ton_pubkey,
                            eth_address: _eth_address,
                            lock_until: _lock_until
                        }
                    } = (await userData.getEvents('RelayMembershipRequested')).pop();

                    const user_token_balance = await userData.call({method: 'token_balance'});

                    const expected_ton_pubkey = `0x${user_pk.toString(16).padStart(64, '0')}`;
                    const expected_eth_addr = `0x${user_eth_addr.toString(16).padStart(64, '0')}`
                    const block_now = tx.now + 30 * 24 * 60 * 60;

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

                const tx = await endElection(users[3]);
                console.log(tx.out_msgs);
                const init_event = await waitForStakingEvent('RelayRoundInitialized');
                const elect_event = await waitForStakingEvent('ElectionEnded');

                expect(init_event).not.to.be.eq(undefined, "Event not emitted");
                expect(elect_event).not.to.be.eq(undefined, "Event not emitted");

                const round = await getRelayRound(2);
                await waitForDeploy(round.address);

                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const {
                    round_num: _round_num,
                    relay_requests: _relay_requests,
                    min_relays_ok: _min_relays_ok
                } = elect_event;

                expect(_round_num.toString()).to.be.equal('2', "Bad election event - round num");
                expect(_relay_requests.toString()).to.be.equal(USERS_NUM.toString(), "Bad election event - relay requests");
                expect(_min_relays_ok).to.be.equal(true, "Bad election event - min relays");

                const {
                    round_num: _round_num1,
                    round_start_time: _round_start_time,
                    round_addr: _round_addr,
                    relays_count: _relays_count,
                    duplicate: _duplicate
                } = init_event;

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

                const relay_rounds_data = await stakingRoot.call({method: 'getRelayRoundsDetails'});
                expect(relay_rounds_data.currentRelayRound.toString()).to.be.equal('2', "Bad round installed in root");

                // check all relays are installed
                const round_details = await round.call({method: 'getDetails'});
                const relays = round_details.relays;
                const rel_addrs = relays.map((elem) => elem.staker_addr);

                users.map((user) => {
                    expect(rel_addrs.includes(user.address)).to.be.true;
                });
            });
        });

        describe("Not enough relay requests on election", async function() {
            it("New reward round starts", async function () {
                await startNewRewardRound();
                await wait(PER_ACTION_WAIT);

                const event = await waitForStakingEvent('NewRewardRound');

                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }
                expect(event).not.to.be.eq(undefined, "Event not emitted");

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
                await wait(TIME_BEFORE_ELECTION * 1000);

                const tx = await startElection(users[1]);
                console.log(tx.out_msgs);
                const event = await waitForStakingEvent('ElectionStarted');

                const election = await getElection(3);
                logger.log(`New election ${election.address}`);
                await waitForDeploy(election.address);

                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                expect(event).not.to.be.eq(undefined, "Event not emitted");

                const round_num = await election.call({method: 'round_num'});
                expect(round_num.toString()).to.be.equal('3', "Bad election - round num");

                const {
                    round_num: _round_num,
                    election_start_time: _election_start_time,
                    election_addr: _election_addr,
                } = event;

                expect(_round_num.toString()).to.be.equal('3', "Bad election - round num");
                expect(_election_addr).to.be.equal(election.address, "Bad election - address");

            });

            it("Users request relay membership", async function() {
                const user = users[0];
                const userData = userDatas[0];
                const user_eth_addr = eth_addrs[0];

                const tx = await requestRelayMembership(user, userData);
                await wait(PER_ACTION_WAIT);

                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                const {
                    value: {
                        round_num: _round_num1,
                        tokens: _tokens1,
                        ton_pubkey: _ton_pubkey1,
                        eth_address: _eth_address1,
                        lock_until: _lock_until1
                    }
                } = (await userData.getEvents('RelayMembershipRequested')).pop();

                const user_token_balance = await userData.call({method: 'token_balance'});

                const user_pk = new BigNumber(user.keyPair.public, 16);
                const expected_ton_pubkey1 = `0x${user_pk.toString(16).padStart(64, '0')}`;
                const user_eth = new BigNumber(user_eth_addr.toLowerCase(), 16);
                const block_now = tx.now + 30 * 24 * 60 * 60;

                const expected_eth_addr = `0x${user_eth.toString(16).padStart(64, '0')}`
                expect(_round_num1.toString()).to.be.equal('3', 'Bad event - round num');
                expect(_tokens1.toString()).to.be.equal(user_token_balance.toString(), "Bad event - tokens");
                expect(_ton_pubkey1.toString()).to.be.equal(expected_ton_pubkey1, "Bad event - ton pubkey");
                expect(_eth_address1.toString(16)).to.be.equal(expected_eth_addr, "Bad event - eth address");
                expect(Number(_lock_until1)).to.be.gte(Number(block_now), "Bad event - lock");
            });

            it("Election ends, not enough users participated, clone prev. round", async function() {
                await wait(ELECTION_TIME * 1000);

                const reward_rounds = await stakingRoot.call({method: 'rewardRounds'});

                const tx = await endElection(users[2]);
                console.log(tx.out_msgs);
                const init_event = await waitForStakingEvent('RelayRoundInitialized');
                const elect_event = await waitForStakingEvent('ElectionEnded');

                if (locklift.network === 'dev') {
                    await wait(DEV_WAIT);
                }

                expect(init_event).not.to.be.eq(undefined, "Event not emitted");
                expect(elect_event).not.to.be.eq(undefined, "Event not emitted");

                const round = await getRelayRound(3);
                await waitForDeploy(round.address);

                const {
                    round_num: _round_num,
                    relay_requests: _relay_requests,
                    min_relays_ok: _min_relays_ok
                } = elect_event;

                expect(_round_num.toString()).to.be.equal('3', "Bad election event - round num");
                expect(_relay_requests.toString()).to.be.equal('1', "Bad election event - relay requests");
                expect(_min_relays_ok).to.be.equal(false, "Bad election event - min relays");

                const {
                    round_num: _round_num1,
                    round_start_time: _round_start_time,
                    round_addr: _round_addr,
                    relays_count: _relays_count,
                    duplicate: _duplicate
                } = init_event;

                expect(_round_num1.toString()).to.be.equal('3', "Bad relay init event - round num");
                expect(_round_addr.toString()).to.be.equal(round.address, "Bad relay init event - round addr");
                expect(_relays_count.toString()).to.be.equal(USERS_NUM.toString(), "Bad relay init event - relays count");
                expect(_duplicate).to.be.equal(true, "Bad relay init event - duplicate");

                const stored_round_num = await round.call({method: 'round_num'});
                const stored_relays_count = await round.call({method: 'relays_count'});
                const stored_reward_round_num = await round.call({method: 'reward_round_num'});
                const stored_relays_installed = await round.call({method: 'relays_installed'});
                const stored_duplicate = await round.call({method: 'duplicate'});

                expect(stored_round_num.toString()).to.be.equal('3', "Bad round created - round num");
                expect(stored_relays_count.toString()).to.be.equal(USERS_NUM.toString(), "Bad round created - relays count");
                expect(stored_reward_round_num.toString()).to.be.equal('1', "Bad round created - reward round num");
                expect(stored_relays_installed).to.be.equal(true, "Bad round created - relays installed");
                expect(stored_duplicate).to.be.equal(true, "Bad round created - duplicate");

                const round_reward = await round.call({method: 'round_reward'});
                const reward_rounds_new = await stakingRoot.call({method: 'rewardRounds'});
                // console.log(reward_rounds, reward_rounds_new, round_reward.toString());
                const expected_reward = round_reward.plus(new BigNumber(reward_rounds[1].totalReward));
                expect(expected_reward.toString()).to.be.equal(reward_rounds_new[1].totalReward.toString(), "Bad reward after relay round init");


                const relay_rounds_data = await stakingRoot.call({method: 'getRelayRoundsDetails'});
                expect(relay_rounds_data.currentRelayRound.toString()).to.be.equal('3', "Bad round installed in root");

                // check all relays are installed
                const round_details = await round.call({method: 'getDetails'});
                const relays = round_details.relays;
                const rel_addrs = relays.map((elem) => elem.staker_addr);

                users.map((user) => {
                    expect(rel_addrs.includes(user.address)).to.be.true;
                });
            });
        });
    });
});
