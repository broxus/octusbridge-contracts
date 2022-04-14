const {
    expect, deployAccount, deployTokenRoot, mintTokens, depositTokens
} = require('../utils');
const BigNumber = require('bignumber.js');
const logger = require('mocha-logger');
const {
    convertCrystal
} = locklift.utils;

const TOKEN_PATH = '../node_modules/ton-eth-bridge-token-contracts/build';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

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


describe('Test Staking Rewards', async function () {
    this.timeout(10000000);

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
            it('Deploy staking', async function () {
                const [keyPair, keyPair1] = await locklift.keys.getKeyPairs();

                const TonConfigMockup = await locklift.factory.getContract('TonConfigMockup');
                const ton_config_mockup = await locklift.giver.deployContract({
                    contract: TonConfigMockup,
                    constructorParams: {},
                    initParams: {nonce: locklift.utils.getRandomNonce()},
                    keyPair: keyPair
                }, locklift.utils.convertCrystal(1, 'nano'));

                stakingRoot = await locklift.factory.getContract('Staking');
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
                        stakingCode: stakingRoot.code,
                        _admin: stakingOwner.address,
                        _tokenRoot: stakingToken.address,
                        _dao_root: stakingOwner.address,
                        _rewarder: stakingOwner.address,
                        _rescuer: stakingOwner.address,
                        _bridge_event_config_eth_ton: stakingOwner.address,
                        _bridge_event_config_ton_eth: ton_config_mockup.address,
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
        });
    });

    describe('Testing staking upgrade', async function () {
        it('Calling upgrade', async function () {
            const new_code = await locklift.factory.getContract('StakingV1_1');
           const tx = await stakingOwner.runTarget({
               contract: stakingRoot,
               method: 'upgrade',
               params: {code: new_code.code, send_gas_to: stakingOwner.address},
               value: locklift.utils.convertCrystal(11, 'nano')
           });

            new_code.setAddress(stakingRoot.address);
            (await new_code.getEvents('StakingUpdated')).pop();
        });

        it('Test storage', async function() {
            await stakingRoot.call({method: 'getDetails'});
        })
    });
})
