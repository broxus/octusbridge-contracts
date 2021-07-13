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
let user2;
let stakingOwner;
let userTokenWallet1;
let userTokenWallet2;
let ownerWallet;
let userInitialTokenBal = 10000;


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
                    const Account = await locklift.factory.getAccount('Wallet');
                    const _user = await locklift.giver.deployContract({
                        contract: Account,
                        constructorParams: {},
                        initParams: {
                            _randomNonce: getRandomNonce()
                        },
                        keyPair,
                    }, convertCrystal(25, 'nano'));

                    _user.afterRun = afterRun;

                    _user.setKeyPair(keyPair);

                    const userBalance = await locklift.ton.getBalance(_user.address);

                    expect(userBalance.toNumber()).to.be.above(0, 'Bad user balance');

                    logger.log(`User address: ${_user.address}`);

                    const {
                        acc_type_name
                    } = await locklift.ton.getAccountType(_user.address);

                    expect(acc_type_name).to.be.equal('Active', 'User account not active');
                    users.push(_user);
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
                const amount = userInitialTokenBal;

                await depositTokens(stakingOwner, ownerWallet, amount, true);

                const staking_balance = await stakingWallet.call({method: 'balance'});
                const staking_balance_stored = await stakingRoot.call({method: 'rewardTokenBalance'});

                expect(staking_balance.toString()).to.be.equal(amount.toString(), 'Farm pool balance empty');
                expect(staking_balance_stored.toString()).to.be.equal(amount.toString(), 'Farm pool balance not recognized');
            });
        });
    });

    describe('Scenario #1', async function () {

    });
})
