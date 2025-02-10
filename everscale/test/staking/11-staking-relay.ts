export {};

import {FactorySource} from "../../build/factorySource";
import {Address, Contract, Signer} from "locklift";
import {Account} from "everscale-standalone-client/nodejs";
import {expect} from "chai";


import {deployAccount} from "../utils/account";
import {
    deployTokenRoot,
    depositTokens,
    mintTokens
} from "../utils/token";
import {tryIncreaseTime} from "../utils/time";


const logger = require("mocha-logger");
const BigNumber = require("bignumber.js");

const user1_eth_addr = "0x93E05804b0A58668531F65A93AbfA1aD8F7F5B2b";
const user2_eth_addr = "0x197216E3421D13A72Fdd79A44d8d89f121dcab6C";
const user3_eth_addr = "0xaF2AAf6316a137bbD7D4a9d3279D06E80EE79423";

let stakingRoot: Contract<FactorySource["StakingV1_2"]>;
let stakingToken: Contract<FactorySource["TokenRoot"]>;
let stakingWallet: Contract<FactorySource["TokenWallet"]>;

let encoder: Contract<FactorySource["CellEncoderStandalone"]>;

let user1: Account;
let user1Data: Contract<FactorySource["UserData"]>;
let user2: Account;
let user2Data: Contract<FactorySource["UserData"]>;
let user3: Account;
let user3Data: Contract<FactorySource["UserData"]>;
let stakingOwner: Account;
let userTokenWallet1: Contract<FactorySource["TokenWallet"]>;
let userTokenWallet2: Contract<FactorySource["TokenWallet"]>;
let userTokenWallet3: Contract<FactorySource["TokenWallet"]>;
let ownerWallet: Contract<FactorySource["TokenWallet"]>;
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

describe("Test Staking Relay mechanic", async function () {
    this.timeout(10000000);

    const userRewardRounds = async function (
        userData: Contract<FactorySource["UserData"]>
    ) {
        const details = await userData.methods
            .getDetails({answerId: 0})
            .call({ responsible: true })
            .then((v) => v.value0);
        return details.rewardRounds;
    };

    const userTokenBalance = async function (
        userData: Contract<FactorySource["UserData"]>
    ) {
        const details = await userData.methods
            .getDetails({answerId: 0})
            .call({ responsible: true })
            .then((v) => v.value0);
        return details.token_balance;
    };

    const checkTokenBalances = async function (
        userTokenWallet: Contract<FactorySource["TokenWallet"]>,
        userAccount: Contract<FactorySource["UserData"]>,
        pool_wallet_bal: number,
        pool_bal: number,
        pool_reward_bal: number,
        user_bal: number,
        user_data_bal: number
    ) {
        const staking_details = await stakingRoot.methods
            .getDetails({answerId: 0})
            .call({ responsible: true })
            .then((v) => v.value0);

        const _pool_wallet_bal = await stakingWallet.methods
            .balance({answerId: 0})
            .call({ responsible: true })
            .then((v) => v.value0);
        const _pool_bal = staking_details.tokenBalance;
        const _pool_reward_bal = staking_details.rewardTokenBalance;

        const _user_bal = await userTokenWallet.methods
            .balance({answerId: 0})
            .call({ responsible: true })
            .then((t) => t.value0);
        const user_data = await userAccount.methods
            .getDetails({answerId: 0})
            .call({ responsible: true });
        const _user_data_bal = user_data.value0.token_balance;

        expect(_pool_wallet_bal).to.be.equal(
            pool_wallet_bal.toString(),
            "Pool wallet balance bad"
        );
        expect(_pool_bal.toString()).to.be.equal(
            pool_bal.toString(),
            "Pool balance bad"
        );
        expect(_pool_reward_bal.toString()).to.be.equal(
            pool_reward_bal.toString(),
            "Pool reward balance bad"
        );
        expect(_user_bal.toString()).to.be.equal(
            user_bal.toString(),
            "User balance bad"
        );
        expect(_user_data_bal.toString()).to.be.equal(
            user_data_bal.toString(),
            "User data balance bad"
        );
    };

    const startNewRewardRound = async function () {
        return await locklift.transactions.waitFinalized(
            stakingRoot.methods
                .startNewRewardRound({
                    send_gas_to: stakingOwner.address,
                })
                .send({
                    from: stakingOwner.address,
                    amount: locklift.utils.toNano(30),
                })
        );
    };

    const getRewardForRelayRound = async function (
        user: Signer,
        userData: Contract<FactorySource["UserData"]>,
        round_num: number
    ) {
        return await userData.methods
            .getRewardForRelayRound({
                round_num: round_num,
            })
            .sendExternal({publicKey: user.publicKey});
    };

    const getElection = async function (round_num: number) {
        const addr = await stakingRoot.methods
            .getElectionAddress({
                round_num: round_num,
                answerId: 0,
            })
            .call({ responsible: true })
            .then((t) => t.value0);
        const election = locklift.factory.getDeployedContract(
            "Election",
            addr
        );
        return election;
    };

    const deployEncoder = async function () {
        const signer = (await locklift.keystore.getSigner("0"))!;

        let {contract: enc} = await locklift.factory.deployContract({
            contract: "CellEncoderStandalone",
            constructorParams: {},
            initParams: {
                _randomNonce: locklift.utils.getRandomNonce(),
            },
            publicKey: signer.publicKey,
            value: locklift.utils.toNano(1),
        });
        return enc;
    };

    const getRelayRound = async function (round_num: number) {
        const addr = await stakingRoot.methods
            .getRelayRoundAddress({
                round_num: round_num,
                answerId: 0,
            })
            .call({ responsible: true });
        const round = locklift.factory.getDeployedContract(
            "StakingRelayRound",
            addr.value0
        );
        return round;
    };

    const getBalance = async function (address: Address) {
        const res = await locklift.provider.getBalance(address);
        return new BigNumber(res);
    };

    const requestRelayMembership = async function (
        _user: Signer,
        _userData: Contract<FactorySource["UserData"]>
    ) {
        return await _userData.methods
            .becomeRelayNextRound({})
            .sendExternal({publicKey: _user.publicKey});
    };

    const startElection = async function (_user: Signer) {
        return await stakingRoot.methods
            .startElectionOnNewRound({})
            .sendExternal({publicKey: _user.publicKey});
    };

    const endElection = async function (_user: Signer) {
        return await stakingRoot.methods
            .endElection({})
            .sendExternal({publicKey: _user.publicKey});
    };

    const slashUser = async function (_user: Account) {
        return await stakingRoot.methods
            .slashRelay({
                relay_staker_addr: _user.address,
                send_gas_to: stakingOwner.address,
            })
            .send({
                from: stakingOwner.address,
                amount: locklift.utils.toNano(30),
            });
    };

    const setEmergency = async function () {
        return await stakingRoot.methods
            .setEmergency({
                _emergency: true,
                send_gas_to: stakingOwner.address,
            })
            .send({
                from: stakingOwner.address,
                amount: locklift.utils.toNano(30),
            });
    };

    const withdrawTokens = async function (
        user: Account,
        withdraw_amount: number
    ) {
        return await stakingRoot.methods
            .withdraw({
                amount: withdraw_amount,
                send_gas_to: user.address,
            })
            .send({
                from: user.address,
                amount: locklift.utils.toNano(30),
            });
    };

    const withdrawEmergency = async function (amount: number, all: any) {
        return await stakingRoot.methods
            .withdrawTokensEmergency({
                amount: amount,
                receiver: stakingOwner.address,
                all: all,
                send_gas_to: stakingOwner.address,
            })
            .send({
                from: stakingOwner.address,
                amount: locklift.utils.toNano(30),
            });
    };

    const confirmTonRelayAccount = async function (
        _user: Signer,
        _userData: Contract<FactorySource["UserData"]>
    ) {
        return await _userData.methods
            .confirmTonAccount({})
            .sendExternal({publicKey: _user.publicKey});
    };

    const confirmEthRelayAccount = async function (
        _user: Account,
        _user_eth_addr: string
    ) {
        const event_data = await encoder.methods
            .encodeEthereumEverscaleStakingEventData({
                eth_addr: _user_eth_addr,
                wk_id: 0,
                ton_addr_body: new BigNumber(
                    `0x${_user.address.toString().slice(2)}`
                ).toFixed(0),
            })
            .call();

        return await stakingRoot.methods
            .onEventConfirmed({
                eventData: {
                    voteData: {
                        eventTransaction: 0,
                        eventIndex: 0,
                        eventData: event_data.data,
                        eventBlockNumber: 0,
                        eventBlock: 0,
                    },
                    configuration: _user.address,
                    staking: _user.address,
                    chainId: 0,
                },
                gasBackAddress: stakingOwner.address,
            })
            .send({
                from: stakingOwner.address,
                amount: locklift.utils.toNano(30),
            });
    };

    const linkRelayAccounts = async function (
        _user: Account,
        ton_pk: string,
        eth_addr: string
    ) {
        const user_pk = new BigNumber(ton_pk, 16);
        const user_eth = new BigNumber(eth_addr.toLowerCase(), 16);

        const input_params = {
            ton_pubkey: user_pk.toFixed(),
            eth_address: user_eth.toFixed(),
        };

        return await stakingRoot.methods.linkRelayAccounts(input_params).send({
            from: _user.address,
            amount: locklift.utils.toNano(RELAY_INITIAL_DEPOSIT + 30),
        });
    };

    const getUserDataAccount = async function (_user: Account) {
        const userData = locklift.factory.getDeployedContract(
            "UserData",
            await stakingRoot.methods
                .getUserDataAddress({
                    user: _user.address,
                    answerId: 0,
                })
                .call({ responsible: true })
                .then((t) => t.value0)
        );
        return userData;
    };

    const waitForDeploy = async function (address: Address) {
        return await getBalance(address);
    };

    describe("Setup contracts", async function () {
        describe("Token", async function () {
            it("Deploy admin", async function () {
                const signer = (await locklift.keystore.getSigner("3"))!;
                stakingOwner = await deployAccount(signer, RELAY_INITIAL_DEPOSIT + 100);
            });

            it("Deploy root", async function () {
                stakingToken = await deployTokenRoot("Farm token", "FT", 9, stakingOwner.address);
            });
        });

        describe("Users", async function () {
            it("Deploy users accounts", async function () {
                let users = [];
                for (const i of [0, 1, 2]) {
                    const keyPair = await locklift.keystore.getSigner(i.toString());
                    const account = await deployAccount(
                        keyPair as Signer,
                        RELAY_INITIAL_DEPOSIT + 100
                    );
                    logger.log(`User address: ${account.address}`);
                    users.push(account);
                }
                [user1, user2, user3] = users;
            });

            it("Deploy users token wallets + mint", async function () {
                [userTokenWallet1, userTokenWallet2, userTokenWallet3, ownerWallet] =
                    await mintTokens(
                        stakingOwner,
                        [user1, user2, user3, stakingOwner],
                        stakingToken,
                        userInitialTokenBal
                    );

                const balance1 = await userTokenWallet1.methods
                    .balance({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => parseInt(t.value0, 10));

                const balance2 = await userTokenWallet2.methods
                    .balance({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => parseInt(t.value0, 10));

                const balance3 = await userTokenWallet3.methods
                    .balance({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => parseInt(t.value0, 10));

                const balance4 = await ownerWallet.methods
                    .balance({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => parseInt(t.value0, 10));

                expect(balance1).to.be.equal(
                    userInitialTokenBal,
                    "User ton token wallet empty"
                );
                expect(balance2).to.be.equal(
                    userInitialTokenBal,
                    "User ton token wallet empty"
                );
                expect(balance3).to.be.equal(
                    userInitialTokenBal,
                    "User ton token wallet empty"
                );
                expect(balance4).to.be.equal(
                    userInitialTokenBal,
                    "User ton token wallet empty"
                );
            });
        });

        describe("Staking", async function () {
            it("Deploy encoder", async function () {
                encoder = await deployEncoder();
            });

            it("Deploy staking", async function () {
                const signer = (await locklift.keystore.getSigner("0"))!;

                const {contract: ton_config_mockup} =
                    await locklift.factory.deployContract({
                        contract: "TonConfigMockup",
                        constructorParams: {},
                        initParams: {nonce: locklift.utils.getRandomNonce()},
                        publicKey: signer.publicKey,
                        value: locklift.utils.toNano(1),
                    });

                const {contract: sol_config_mockup} =
                    await locklift.factory.deployContract({
                        contract: "SolConfigMockup",
                        constructorParams: {},
                        initParams: {nonce: locklift.utils.getRandomNonce()},
                        publicKey: signer.publicKey,
                        value: locklift.utils.toNano(1),
                    });

                const stakingRootData = locklift.factory.getContractArtifacts(
                    "StakingV1_2"
                );
                const {contract: stakingRootDeployer} =
                    await locklift.factory.deployContract({
                        contract: "StakingRootDeployer",
                        constructorParams: {},
                        initParams: {
                            nonce: locklift.utils.getRandomNonce(),
                            stakingCode: stakingRootData.code,
                        },
                        publicKey: signer.publicKey,
                        value: locklift.utils.toNano(50),
                    });

                logger.log(`Deploying stakingRoot`);
                const addr = await stakingRootDeployer.methods
                    .deploy({
                        _admin: stakingOwner.address,
                        _tokenRoot: stakingToken.address,
                        _dao_root: stakingOwner.address,
                        _rewarder: stakingOwner.address,
                        _rescuer: stakingOwner.address,
                        _bridge_event_config_eth_ton: stakingOwner.address,
                        _bridge_event_config_ton_eth: ton_config_mockup.address,
                        _bridge_event_config_ton_sol: sol_config_mockup.address,
                        _deploy_nonce: locklift.utils.getRandomNonce(),
                    })
                    .sendExternal({
                        publicKey: signer.publicKey,
                    });
                stakingRoot = locklift.factory.getDeployedContract(
                    "StakingV1_2",
                    addr.output?.value0!
                );
                logger.log(`StakingRoot address: ${stakingRoot.address}`);
                logger.log(`StakingRoot owner address: ${stakingOwner.address}`);
                logger.log(`StakingRoot token root address: ${stakingToken.address}`);

                const staking_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                logger.log(`Staking token wallet: ${staking_details.tokenWallet}`);

                stakingWallet = locklift.factory.getDeployedContract(
                    "TokenWallet",
                    staking_details.tokenWallet
                );

                // call in order to check if wallet is deployed
                const owner_address = await stakingWallet.methods
                    .owner({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => t.value0);

                const root_address = await stakingWallet.methods
                    .root({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => t.value0);
                expect(owner_address.toString()).to.be.equal(
                    stakingRoot.address.toString(),
                    "Wrong staking token wallet owner"
                );
                expect(root_address.toString()).to.be.equal(
                    stakingToken.address.toString(),
                    "Wrong staking token wallet root"
                );
            });

            it("Installing codes", async function () {
                const UserData = locklift.factory.getContractArtifacts(
                    "UserData"
                );
                const Election = locklift.factory.getContractArtifacts(
                    "Election"
                );
                const RelayRound = locklift.factory.getContractArtifacts(
                    "StakingRelayRound"
                );
                const Platform = locklift.factory.getContractArtifacts(
                    "Platform"
                );

                logger.log(`Installing Platform code`);
                await stakingRoot.methods
                    .installPlatformOnce({
                        code: Platform.code,
                        send_gas_to: stakingOwner.address,
                    })
                    .send({
                        from: stakingOwner.address,
                        amount: locklift.utils.toNano(30),
                    });

                logger.log(`Installing UserData code`);
                await stakingRoot.methods
                    .installOrUpdateUserDataCode({
                        code: UserData.code,
                        send_gas_to: stakingOwner.address,
                    })
                    .send({
                        from: stakingOwner.address,
                        amount: locklift.utils.toNano(30),
                    });
                logger.log(`Installing ElectionCode code`);
                await stakingRoot.methods
                    .installOrUpdateElectionCode({
                        code: Election.code,
                        send_gas_to: stakingOwner.address,
                    })
                    .send({
                        from: stakingOwner.address,
                        amount: locklift.utils.toNano(30),
                    });
                logger.log(`Installing RelayRoundCode code`);
                await stakingRoot.methods
                    .installOrUpdateRelayRoundCode({
                        code: RelayRound.code,
                        send_gas_to: stakingOwner.address,
                    })
                    .send({
                        from: stakingOwner.address,
                        amount: locklift.utils.toNano(30),
                    });
                logger.log(`Set staking to Active`);
                await stakingRoot.methods
                    .setActive({
                        new_active: true,
                        send_gas_to: stakingOwner.address,
                    })
                    .send({
                        from: stakingOwner.address,
                        amount: locklift.utils.toNano(30),
                    });

                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                await tryIncreaseTime(DEV_WAIT);

                const active = await stakingRoot.methods
                    .isActive({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => t.value0);
                expect(active).to.be.equal(true, "Staking not active");
            });

            it("Sending reward tokens to staking", async function () {
                const amount = rewardTokensBal;

                await depositTokens(
                    stakingRoot,
                    stakingOwner,
                    ownerWallet,
                    amount,
                    true
                );
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                await tryIncreaseTime(DEV_WAIT);

                const staking_balance = await stakingWallet.methods
                    .balance({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);

                const staking_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const staking_balance_stored = staking_details.rewardTokenBalance;

                expect(staking_balance.toString()).to.be.equal(
                    amount.toString(),
                    "Farm pool balance empty"
                );
                expect(staking_balance_stored.toString()).to.be.equal(
                    amount.toString(),
                    "Farm pool balance not recognized"
                );
            });

            it("Setting relay config for testing", async function () {
                // super minimal relay config for local testing
                const init_deposit = locklift.utils.toNano(RELAY_INITIAL_DEPOSIT);

                await stakingRoot.methods
                    .setRelayConfig({
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
                        send_gas_to: stakingOwner.address,
                    })
                    .send({
                        from: stakingOwner.address,
                        amount: locklift.utils.toNano(30),
                    });

                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                await tryIncreaseTime(DEV_WAIT);

                const relay_config = await stakingRoot.methods
                    .getRelayConfig({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => t.value0);
                expect(relay_config.relaysCount.toString()).to.be.equal(
                    RELAYS_COUNT_1.toString(),
                    "Relay config not installed"
                );
            });
        });
    });

    describe("Relay pipeline testing", async function () {
        describe("Standard case", async function () {
            let user1_deposit_time;
            let user2_deposit_time;

            it("Users deposit tokens", async function () {
                const tx = await depositTokens(
                    stakingRoot,
                    user1,
                    userTokenWallet1,
                    userDeposit
                );
                user1Data = await getUserDataAccount(user1);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                await tryIncreaseTime(DEV_WAIT);

                await checkTokenBalances(
                    userTokenWallet1,
                    user1Data,
                    rewardTokensBal + userDeposit,
                    userDeposit,
                    rewardTokensBal,
                    userInitialTokenBal - userDeposit,
                    userDeposit
                );

                const staking_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                user1_deposit_time = staking_details.lastRewardTime;

                await depositTokens(
                    stakingRoot,
                    user2,
                    userTokenWallet2,
                    userDeposit * 2
                );
                user2Data = await getUserDataAccount(user2);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                await tryIncreaseTime(DEV_WAIT);

                await checkTokenBalances(
                    userTokenWallet2,
                    user2Data,
                    rewardTokensBal + userDeposit * 3,
                    userDeposit * 3,
                    rewardTokensBal,
                    userInitialTokenBal - userDeposit * 2,
                    userDeposit * 2
                );
                const staking_details_1 = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                user2_deposit_time = staking_details_1.lastRewardTime;

                await depositTokens(
                    stakingRoot,
                    user3,
                    userTokenWallet3,
                    userDeposit * 3
                );
                user3Data = await getUserDataAccount(user3);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                await tryIncreaseTime(DEV_WAIT);

                await checkTokenBalances(
                    userTokenWallet3,
                    user3Data,
                    rewardTokensBal + userDeposit * 6,
                    userDeposit * 6,
                    rewardTokensBal,
                    userInitialTokenBal - userDeposit * 3,
                    userDeposit * 3
                );
            });

            it("Creating origin relay round", async function () {
                const user1_pk = new BigNumber(
                    (await locklift.keystore.getSigner("0"))!.publicKey,
                    16
                );
                const user1_eth = new BigNumber(user1_eth_addr.toLowerCase(), 16);
                //
                // const input_params = {
                //     staker_addrs: [user1.address],
                //     ton_pubkeys: [user1_pk.toFixed()],
                //     eth_addrs: [user1_eth.toFixed()],
                //     staked_tokens: [1],
                //     ton_deposit: locklift.utils.toNano(100),
                //     send_gas_to: stakingOwner.address,
                // };

                const staking_details_0 = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const reward_rounds = staking_details_0.rewardRounds;

                await stakingRoot.methods.createOriginRelayRound(
                  {
                      staker_addrs: [user1.address],
                      ton_pubkeys: [user1_pk.toFixed()],
                      eth_addrs: [user1_eth.toFixed()],
                      staked_tokens: [1],
                      ton_deposit: locklift.utils.toNano(100)
                  }
                ).send({
                    from: stakingOwner.address,
                    amount: locklift.utils.toNano(200),
                });

                // await tryIncreaseTime(500);

                await tryIncreaseTime(1000);

                const round = await getRelayRound(0);
                await waitForDeploy(round.address);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                await tryIncreaseTime(DEV_WAIT);

                const total_tokens_staked = await round.methods
                    .total_tokens_staked()
                    .call()
                    .then((v) => v.total_tokens_staked);
                const round_reward = await round.methods
                    .round_reward()
                    .call()
                    .then((v) => v.round_reward);
                const relays_count = await round.methods
                    .relays_count()
                    .call()
                    .then((v) => v.relays_count);
                const reward_round_num = await round.methods
                    .reward_round_num()
                    .call()
                    .then((v) => v.reward_round_num);

                const _round_reward = RELAY_ROUND_TIME_1 * rewardPerSec;
                expect(total_tokens_staked.toString()).to.be.equal(
                    "1",
                    "Bad relay round"
                );
                expect(round_reward.toString()).to.be.equal(
                    _round_reward.toString(),
                    "Bad relay round"
                );
                expect(relays_count.toString()).to.be.equal("1", "Bad relay round");
                expect(reward_round_num.toString()).to.be.equal("0", "Bad relay round");

                const relay_rounds_data = await stakingRoot.methods
                    .getRelayRoundsDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => t.value0);
                expect(relay_rounds_data.currentRelayRound.toString()).to.be.equal(
                    "0",
                    "Bad round installed in root"
                );

                const staking_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const reward_rounds_new = staking_details.rewardRounds;

                const expected_reward = new BigNumber(round_reward).plus(
                    new BigNumber(reward_rounds[0].totalReward)
                );

                expect(expected_reward.toString()).to.be.equal(
                    reward_rounds_new[0].totalReward.toString(),
                    "Bad reward after relay round init"
                );

                const events = await stakingRoot
                    .getPastEvents({filter: "RelayRoundInitialized"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num,
                            round_start_time: _round_start_time,
                            round_end_time: _round_end_time,
                            round_addr: _round_addr,
                            relays_count: _relays_count,
                            duplicate: _duplicate,
                        },
                    },
                ] = events;

                expect(_round_num.toString()).to.be.equal("0", "Bad event");
                expect(_round_addr.toString()).to.be.equal(
                    round.address.toString(),
                    "Bad event"
                );

                expect(_relays_count.toString()).to.be.equal(
                    "1",
                    "Relay creation fail - relays count"
                );
                expect(_duplicate).to.be.equal(
                    false,
                    "Relay creation fail - duplicate"
                );

                const relay = await round.methods
                    .getRelayByStakerAddress({
                        _relay_staker_addr: user1.address,
                        answerId: 0,
                    })
                    .call({ responsible: true });

                expect(relay._staker_addr.toString()).to.be.equal(
                    user1.address.toString(),
                    "Relay creation fail - staker addr"
                );
                expect(new BigNumber(relay._ton_key).toString(16)).to.be.equal(
                    user1_pk.toString(16),
                    "Relay creation fail - ton pubkey"
                );
                expect(new BigNumber(relay._eth_addr).toString(16)).to.be.equal(
                    user1_eth.toString(16),
                    "Relay creation fail - eth addr"
                );
                expect(relay._staked_tokens.toString()).to.be.equal(
                    "1",
                    "Relay creation fail - staked tokens"
                );
            });

            it("Users link relay accounts", async function () {
                // 1st user is relay already
                // await sendTons(stakingOwner, user1Data);

                await linkRelayAccounts(
                    user2,
                    (await locklift.keystore.getSigner("1"))!.publicKey,
                    user2_eth_addr
                );
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                await tryIncreaseTime(DEV_WAIT);

                const user2_details = await user2Data.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const user2_pk = user2_details.relay_ton_pubkey;
                const _user2_eth_addr = user2_details.relay_eth_address;

                const user2_pk_expected = new BigNumber(
                    (await locklift.keystore.getSigner("1"))!.publicKey,
                    16
                );
                const user2_eth_addr_expected = new BigNumber(
                    user2_eth_addr.toLowerCase(),
                    16
                );

                expect(user2_pk_expected.toString(16)).to.be.equal(
                    BigNumber(user2_pk).toString(16),
                    "Bad ton pubkey installed"
                );
                expect(BigNumber(_user2_eth_addr).toString(16)).to.be.equal(
                    user2_eth_addr_expected.toString(16),
                    "Bad eth addr installed"
                );

                await linkRelayAccounts(
                    user3,
                    (await locklift.keystore.getSigner("2"))!.publicKey,
                    user3_eth_addr
                );
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                await tryIncreaseTime(DEV_WAIT);

                const user3_details = await user3Data.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const user3_pk = user3_details.relay_ton_pubkey;
                const _user3_eth_addr = user3_details.relay_eth_address;

                const user3_pk_expected = new BigNumber(
                    (await locklift.keystore.getSigner("2"))!.publicKey,
                    16
                );
                const user3_eth_addr_expected = new BigNumber(
                    user3_eth_addr.toLowerCase(),
                    16
                );

                expect(user3_pk_expected.toString(16)).to.be.equal(
                    BigNumber(user3_pk).toString(16),
                    "Bad ton pubkey installed"
                );
                expect(BigNumber(_user3_eth_addr).toString(16)).to.be.equal(
                    user3_eth_addr_expected.toString(16),
                    "Bad eth addr installed"
                );
            });

            it("Users confirm ton relay accounts", async function () {
                const bal2 = await getBalance(user2Data.address);
                const bal3 = await getBalance(user3Data.address);

                await confirmTonRelayAccount(
                    (await locklift.keystore.getSigner("1"))!,
                    user2Data
                );
                await confirmTonRelayAccount(
                    (await locklift.keystore.getSigner("2"))!,
                    user3Data
                );

                const bal2_after = await getBalance(user2Data.address);
                const bal3_after = await getBalance(user3Data.address);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                await tryIncreaseTime(DEV_WAIT);

                const user1_details = await user1Data.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const confirmed_user1 = user1_details.ton_pubkey_confirmed;
                expect(confirmed_user1).to.be.equal(
                    true,
                    "Ton pubkey user1 not confirmed"
                );

                const user2_details = await user2Data.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const confirmed_user2 = user2_details.ton_pubkey_confirmed;
                expect(confirmed_user2).to.be.equal(
                    true,
                    "Ton pubkey user2 not confirmed"
                );
                expect(bal2_after.toNumber()).to.be.gte(
                    bal2.minus(10 ** 9).toNumber(),
                    "Bad gas"
                );

                const user3_details = await user3Data.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const confirmed_user3 = user3_details.ton_pubkey_confirmed;
                expect(confirmed_user3).to.be.equal(
                    true,
                    "Ton pubkey user3 not confirmed"
                );
                expect(bal3_after.toNumber()).to.be.gte(
                    bal3.minus(10 ** 9).toNumber(),
                    "Bad gas"
                );
            });

            it("Users confirm eth relay accounts", async function () {
                await confirmEthRelayAccount(user2, user2_eth_addr);
                await confirmEthRelayAccount(user3, user3_eth_addr);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                await tryIncreaseTime(DEV_WAIT);

                const user1_details = await user1Data.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const confirmed_user1 = user1_details.eth_address_confirmed;
                expect(confirmed_user1).to.be.equal(
                    true,
                    "Eth pubkey user1 not confirmed"
                );

                const user2_details = await user2Data.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const confirmed_user2 = user2_details.eth_address_confirmed;
                expect(confirmed_user2).to.be.equal(
                    true,
                    "Eth pubkey user2 not confirmed"
                );

                const user3_details = await user3Data.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const confirmed_user3 = user3_details.eth_address_confirmed;
                expect(confirmed_user3).to.be.equal(
                    true,
                    "Eth pubkey user3 not confirmed"
                );
            });

            it("Election on new round starts", async function () {
                await tryIncreaseTime(5000);

                const tx = await startElection(
                    (await locklift.keystore.getSigner("1"))!
                );
                const election = await getElection(1);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }
                await tryIncreaseTime(DEV_WAIT);

                const round_num = await election.methods
                    .round_num()
                    .call()
                    .then((t) => t.round_num);
                expect(round_num.toString()).to.be.equal(
                    "1",
                    "Bad election - round num"
                );

                const events = await stakingRoot
                    .getPastEvents({filter: "ElectionStarted"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num,
                            election_start_time: _election_start_time,
                            election_addr: _election_addr,
                        },
                    },
                ] = events;

                expect(_round_num.toString()).to.be.equal(
                    "1",
                    "Bad election - round num"
                );
                expect(_election_addr.toString()).to.be.equal(
                    election.address.toString(),
                    "Bad election - address"
                );
            });

            it("Users request relay membership", async function () {
                const bal1 = await getBalance(user1Data.address);

                const {transaction: tx} = await requestRelayMembership(
                    (await locklift.keystore.getSigner("0"))!,
                    user1Data
                );
                const election = await getElection(1);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }
                await tryIncreaseTime(DEV_WAIT);

                const bal1_after = await getBalance(user1Data.address);

                const events = await user1Data
                    .getPastEvents({filter: "RelayMembershipRequested"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num1,
                            tokens: _tokens1,
                            ton_pubkey: _ton_pubkey1,
                            eth_address: _eth_address1,
                            lock_until: _lock_until1,
                        },
                    },
                ] = events;

                const user1_token_balance = await userTokenBalance(user1Data);

                const user1_pk = new BigNumber(
                    (await locklift.keystore.getSigner("0"))!.publicKey,
                    16
                );
                const expected_ton_pubkey1 = `0x${user1_pk.toString(16)}`;
                const user1_eth = new BigNumber(user1_eth_addr.toLowerCase(), 16);
                const block_now = tx.createdAt + 30 * 24 * 60 * 60;

                // console.log(_lock_until1, block_now);
                expect(_round_num1.toString()).to.be.equal(
                    "1",
                    "Bad event - round num"
                );
                expect(_tokens1.toString()).to.be.equal(
                    user1_token_balance.toString(),
                    "Bad event - tokens"
                );
                expect("0x" + BigNumber(_ton_pubkey1).toString(16)).to.be.equal(
                    expected_ton_pubkey1,
                    "Bad event - ton pubkey"
                );
                expect(_eth_address1.toString()).to.be.equal(
                    user1_eth.toFixed(),
                    "Bad event - eth address"
                );
                // expect(Number(_lock_until1)).to.be.gte(Number(block_now), "Bad event - lock");
                expect(bal1_after.toNumber()).to.be.gte(
                    bal1.minus(15 ** 9).toNumber(),
                    "Bad gas"
                );

                await requestRelayMembership(
                    (await locklift.keystore.getSigner("2"))!,
                    user3Data
                );
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                await tryIncreaseTime(DEV_WAIT);

                const events3 = await user3Data
                    .getPastEvents({filter: "RelayMembershipRequested"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num3,
                            tokens: _tokens3,
                            ton_pubkey: _ton_pubkey3,
                            eth_address: _eth_address3,
                            lock_until: _lock_until3,
                        },
                    },
                ] = events3;

                const user3_token_balance = await userTokenBalance(user3Data);

                const user3_pk = new BigNumber(
                    (await locklift.keystore.getSigner("2"))!.publicKey,
                    16
                );
                const expected_ton_pubkey3 = `0x${user3_pk.toString(16)}`;
                const user3_eth = new BigNumber(user3_eth_addr.toLowerCase(), 16);

                expect(_round_num3.toString()).to.be.equal(
                    "1",
                    "Bad event - round num"
                );
                expect(_tokens3.toString()).to.be.equal(
                    user3_token_balance.toString(),
                    "Bad event - tokens"
                );
                expect("0x" + new BigNumber(_ton_pubkey3).toString(16)).to.be.equal(
                    expected_ton_pubkey3,
                    "Bad event - ton pubkey"
                );
                expect(_eth_address3.toString()).to.be.equal(
                    user3_eth.toFixed(0),
                    "Bad event - eth address"
                );
                // expect(Number(_lock_until3)).to.be.gte(Number(block_now), "Bad event - lock");

                // const [req11, req22] = await election.call({method: 'getRequests', params: {limit: 10}});
                // console.log(req11, req22);
                // console.log(await showNode(election, 1));
                // console.log(await showNode(election, 2));

                await requestRelayMembership(
                    (await locklift.keystore.getSigner("1"))!,
                    user2Data
                );
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                await tryIncreaseTime(DEV_WAIT);

                const events2 = await user2Data
                    .getPastEvents({filter: "RelayMembershipRequested"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num2,
                            tokens: _tokens2,
                            ton_pubkey: _ton_pubkey2,
                            eth_address: _eth_address2,
                            lock_until: _lock_until2,
                        },
                    },
                ] = events2;

                const user2_token_balance = await userTokenBalance(user2Data);

                const user2_pk = new BigNumber(
                    (await locklift.keystore.getSigner("1"))!.publicKey,
                    16
                );
                const expected_ton_pubkey2 = `0x${user2_pk.toString(16)}`;
                const user2_eth = new BigNumber(user2_eth_addr.toLowerCase(), 16);

                expect(_round_num2.toString()).to.be.equal(
                    "1",
                    "Bad event - round num"
                );
                expect(_tokens2.toString()).to.be.equal(
                    user2_token_balance.toString(),
                    "Bad event - tokens"
                );
                expect(_ton_pubkey2.toString()).to.be.equal(
                    user2_pk.toFixed(),
                    "Bad event - ton pubkey"
                );
                expect(_eth_address2.toString()).to.be.equal(
                    user2_eth.toFixed(0),
                    "Bad event - eth address"
                );
                // expect(Number(_lock_until2)).to.be.gte(Number(block_now), "Bad event - lock");

                // now check requests sorted correctly
                // const q = await election.call({method: 'getRequests', params: {limit: 10}});
                // console.log(q);
                const {
                    _ton_keys: ton_keys,
                    _eth_addrs: eth_addrs,
                    _staker_addrs: staker_addrs,
                    _staked_tokens: staked_tokens,
                } = await election.methods
                    .getRequests({limit: 10, answerId: 0})
                    .call({ responsible: true });

                // console.log(req1, req2, req3);
                // console.log(await showNode(election, 1));
                // console.log(await showNode(election, 2));
                // console.log(await showNode(election, 3));
                // console.log(user1.address, user2.address, user3.address);

                expect(staker_addrs[0].toString()).to.be.equal(
                    user3.address.toString(),
                    "Bad request - staker addr"
                );
                expect(staked_tokens[0].toString()).to.be.equal(
                    user3_token_balance.toString(),
                    "Bad request - token balance"
                );
                expect(ton_keys[0].toString()).to.be.equal(
                    user3_pk.toFixed(),
                    "Bad request - ton pubkey"
                );
                expect(eth_addrs[0]).to.be.equal(
                    user3_eth.toFixed(0),
                    "Bad request - eth addr"
                );

                expect(staker_addrs[1].toString()).to.be.equal(
                    user2.address.toString(),
                    "Bad request - staker addr"
                );
                expect(staked_tokens[1].toString()).to.be.equal(
                    user2_token_balance.toString(),
                    "Bad request - token balance"
                );
                expect(ton_keys[1].toString()).to.be.equal(
                    user2_pk.toFixed(),
                    "Bad request - ton pubkey"
                );
                expect(eth_addrs[1]).to.be.equal(
                    user2_eth.toFixed(0),
                    "Bad request - eth addr"
                );

                expect(staker_addrs[2].toString()).to.be.equal(
                    user1.address.toString(),
                    "Bad request - staker addr"
                );
                expect(staked_tokens[2].toString()).to.be.equal(
                    user1_token_balance.toString(),
                    "Bad request - token balance"
                );
                expect(ton_keys[2].toString()).to.be.equal(
                    user1_pk.toFixed(),
                    "Bad request - ton pubkey"
                );
                expect(eth_addrs[2]).to.be.equal(
                    user1_eth.toFixed(0),
                    "Bad request - eth addr"
                );
            });

            it("Election ends, new round initialized", async function () {
                // await tryIncreaseTime(3000);
                await tryIncreaseTime(5000);

                const staking_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const reward_rounds = staking_details.rewardRounds;

                const bal1 = await getBalance(user1Data.address);
                const tx = await endElection((await locklift.keystore.getSigner("0"))!);

                const round = await getRelayRound(1);
                await waitForDeploy(round.address);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                const bal1_after = await getBalance(user1Data.address);
                logger.log(`Round 2 deployed - ${round.address}`);
                // const election = await getElection(2);

                expect(bal1_after.toNumber()).to.be.gte(
                    bal1.minus(5 * 10 ** 9).toNumber(),
                    "Bad gas"
                );

                // console.log('root', stakingRoot.address)
                // console.log('election', election.address);
                // console.log('round', round.address);

                const events = await stakingRoot
                    .getPastEvents({filter: "ElectionEnded"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num,
                            relay_requests: _relay_requests,
                            min_relays_ok: _min_relays_ok,
                        },
                    },
                ] = events;

                expect(_round_num.toString()).to.be.equal(
                    "1",
                    "Bad election event - round num"
                );
                expect(_relay_requests.toString()).to.be.equal(
                    "3",
                    "Bad election event - relay requests"
                );
                expect(_min_relays_ok).to.be.equal(
                    true,
                    "Bad election event - min relays"
                );

                const events1 = await stakingRoot
                    .getPastEvents({filter: "RelayRoundInitialized"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num1,
                            round_start_time: _round_start_time,
                            round_end_time: _round_end_time,
                            round_addr: _round_addr,
                            relays_count: _relays_count,
                            duplicate: _duplicate,
                        },
                    },
                ] = events1;

                expect(_round_num1.toString()).to.be.equal(
                    "1",
                    "Bad relay init event - round num"
                );
                expect(_round_addr.toString()).to.be.equal(
                    round.address.toString(),
                    "Bad relay init event - round addr"
                );
                expect(_relays_count.toString()).to.be.equal(
                    "3",
                    "Bad relay init event - relays count"
                );
                expect(_duplicate).to.be.equal(
                    false,
                    "Bad relay init event - duplicate"
                );

                const round_details = await round.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);

                const stored_round_num = round_details.round_num;
                const stored_relays_count = await round.methods
                    .relays_count()
                    .call()
                    .then((t) => t.relays_count);
                const stored_total_tokens_staked = await round.methods
                    .total_tokens_staked()
                    .call()
                    .then((t) => t.total_tokens_staked);
                const stored_reward_round_num = await round.methods
                    .reward_round_num()
                    .call()
                    .then((t) => t.reward_round_num);
                const stored_relays_installed = round_details.relays_installed;
                const stored_duplicate = await round.methods
                    .duplicate()
                    .call()
                    .then((t) => t.duplicate);

                const expected_staked_tokens = userDeposit * 6;

                expect(stored_round_num.toString()).to.be.equal(
                    "1",
                    "Bad round created - round num"
                );
                expect(stored_relays_count.toString()).to.be.equal(
                    "3",
                    "Bad round created - relays count"
                );
                expect(stored_total_tokens_staked.toString()).to.be.equal(
                    expected_staked_tokens.toString(),
                    "Bad round created - total tokens staked"
                );
                expect(stored_reward_round_num.toString()).to.be.equal(
                    "0",
                    "Bad round created - reward round num"
                );
                expect(stored_relays_installed).to.be.equal(
                    true,
                    "Bad round created - relays installed"
                );
                expect(stored_duplicate).to.be.equal(
                    false,
                    "Bad round created - duplicate"
                );

                const round_reward = (await round.methods.round_reward().call()).round_reward;

                const staking_details_1 = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const reward_rounds_new = staking_details_1.rewardRounds;
                // console.log(reward_rounds, reward_rounds_new, round_reward.toString());
                const expected_reward =
                    (new BigNumber(reward_rounds[0].totalReward)).plus(round_reward);


                expect(expected_reward.toString()).to.be.equal(
                    reward_rounds_new[0].totalReward.toString(),
                    "Bad reward after relay round init"
                );

                const relay_rounds_data = await stakingRoot.methods
                    .getRelayRoundsDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => t.value0);
                expect(relay_rounds_data.currentRelayRound.toString()).to.be.equal(
                    "1",
                    "Bad round installed in root"
                );

                // check all relays are installed
                const relays = round_details.staker_addrs.map((i) => i.toString());
                expect(relays.includes(user1.address.toString())).to.be.true;
                expect(relays.includes(user2.address.toString())).to.be.true;
                expect(relays.includes(user3.address.toString())).to.be.true;

                const election = await getElection(1);
                const bal = await getBalance(election.address);
                expect(bal.toFixed(0)).to.be.eq("0", "Election not destroyed");
            });

            it("User1 get reward for origin round", async function () {
                await tryIncreaseTime(1000);

                // deposit 1 token to sync rewards
                await depositTokens(stakingRoot, user1, userTokenWallet1, 1);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }
                const user1_rewards = await userRewardRounds(user1Data);

                const bal1 = await getBalance(user1Data.address);

                await getRewardForRelayRound(
                    (await locklift.keystore.getSigner("0"))!,
                    user1Data,
                    0
                );
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }
                const user1_rewards_1 = await userRewardRounds(user1Data);
                const staking_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const rewards = staking_details.rewardRounds;
                const round_reward = rewardPerSec * RELAY_ROUND_TIME_1;

                const _userDeposit = await userTokenBalance(user1Data);
                const rew_per_share = new BigNumber(rewards[0].accRewardPerShare);
                const new_reward = rew_per_share
                    .times(_userDeposit)
                    .div(1e18)
                    .minus(user1_rewards[0].reward_debt)
                    .dp(0, 1);

                const bal1_after = await getBalance(user1Data.address);
                expect(bal1_after.toNumber()).to.be.gte(
                    bal1.minus(15 ** 9).toNumber(),
                    "Bad gas"
                );
                const expected = new_reward
                    .plus(user1_rewards[0].reward_balance)
                    .plus(round_reward);
                expect(expected.toString()).to.be.equal(
                    user1_rewards_1[0].reward_balance.toString(),
                    "Bad reward"
                );

                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }

                const events1 = await user1Data
                    .getPastEvents({filter: "RelayRoundRewardClaimed"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            relay_round_num: _relay_round_num,
                            reward_round_num: _reward_round_num,
                            reward: _reward,
                        },
                    },
                ] = events1;

                const expected_reward = rewardPerSec * RELAY_ROUND_TIME_1;
                expect(_relay_round_num.toString()).to.be.equal(
                    "0",
                    "Bad relay round reward event - relay round"
                );
                expect(_reward_round_num.toString()).to.be.equal(
                    "0",
                    "Bad relay round reward event - reward round"
                );
                expect(_reward.toString()).to.be.equal(
                    expected_reward.toString(),
                    "Bad relay round reward event - reward"
                );
            });
        });

        describe("Not enough relay requests on election", async function () {
            it("New reward round starts", async function () {
                await startNewRewardRound();
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }
                await tryIncreaseTime(DEV_WAIT);

                const staking_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const reward_rounds = staking_details.rewardRounds;
                const last_reward_time = staking_details.lastRewardTime;
                const cur_round = reward_rounds[1];

                expect(reward_rounds.length).to.be.equal(2, "Bad reward rounds");
                expect(cur_round.rewardTokens).to.be.equal(
                    "0",
                    "Bad reward rounds balance"
                );
                expect(parseInt(cur_round.accRewardPerShare, 16)).to.be.equal(
                    0,
                    "Bad reward rounds share"
                );
                expect(cur_round.totalReward).to.be.equal(
                    "0",
                    "Bad reward rounds reward"
                );
                expect(cur_round.startTime).to.be.equal(
                    last_reward_time.toString(),
                    "Bad reward rounds start time"
                );
            });

            it("Election on new round starts", async function () {
                // await tryIncreaseTime(5000);
                await tryIncreaseTime(5000);

                const tx = await startElection(
                    (await locklift.keystore.getSigner("2"))!
                );
                const election = await getElection(2);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }
                await tryIncreaseTime(DEV_WAIT);

                const round_num = await election.methods
                    .round_num()
                    .call()
                    .then((t) => t.round_num);
                expect(round_num.toString()).to.be.equal(
                    "2",
                    "Bad election - round num"
                );

                const events1 = await stakingRoot
                    .getPastEvents({filter: "ElectionStarted"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num,
                            election_start_time: _election_start_time,
                            election_addr: _election_addr,
                        },
                    },
                ] = events1;

                expect(_round_num.toString()).to.be.equal(
                    "2",
                    "Bad election - round num"
                );
                expect(_election_addr.toString()).to.be.equal(
                    election.address.toString(),
                    "Bad election - address"
                );
            });

            it("Users request relay membership", async function () {
                const {transaction: tx} = await requestRelayMembership(
                    (await locklift.keystore.getSigner("0"))!,
                    user1Data
                );
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }
                await tryIncreaseTime(DEV_WAIT);

                const events1 = await user1Data
                    .getPastEvents({filter: "RelayMembershipRequested"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num1,
                            tokens: _tokens1,
                            ton_pubkey: _ton_pubkey1,
                            eth_address: _eth_address1,
                            lock_until: _lock_until1,
                        },
                    },
                ] = events1;

                const user1_token_balance = await userTokenBalance(user1Data);

                const user1_pk = new BigNumber(
                    (await locklift.keystore.getSigner("0"))!.publicKey,
                    16
                );
                const user1_eth = new BigNumber(user1_eth_addr.toLowerCase(), 16);
                const block_now = tx.createdAt + 30 * 24 * 60 * 60;

                expect(_round_num1.toString()).to.be.equal(
                    "2",
                    "Bad event - round num"
                );
                expect(_tokens1.toString()).to.be.equal(
                    user1_token_balance.toString(),
                    "Bad event - tokens"
                )
                expect(_ton_pubkey1).to.be.equal(
                    user1_pk.toFixed(),
                    "Bad event - ton pubkey"
                );
                expect(_eth_address1.toString()).to.be.equal(
                    user1_eth.toFixed(0),
                    "Bad event - eth address"
                );
                expect(Number(_lock_until1)).to.be.gte(
                    Number(block_now),
                    "Bad event - lock"
                );
            });

            it("Election ends, not enough users participated, clone prev. round", async function () {
                // await tryIncreaseTime(3500);
                await tryIncreaseTime(5000);

                const staking_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const reward_rounds = staking_details.rewardRounds;
                //
                // const round2 = await getRelayRound(2);
                // const round_details2 = await round2.methods.getDetails({answerId: 0}).call().then(v => v.value0);
                // console.log(round_details2);

                const tx = await endElection((await locklift.keystore.getSigner("0"))!);

                const round = await getRelayRound(2);
                await waitForDeploy(round.address);
                logger.log(`Round 3 deployed - ${round.address}`);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }
                await tryIncreaseTime(DEV_WAIT);

                // const election = await getElection(2);

                // console.log('root', stakingRoot.address)
                // console.log('election', election.address);
                // console.log('round', round.address);

                const events1 = await stakingRoot
                    .getPastEvents({filter: "ElectionEnded"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num,
                            relay_requests: _relay_requests,
                            min_relays_ok: _min_relays_ok,
                        },
                    },
                ] = events1;

                expect(_round_num.toString()).to.be.equal(
                    "2",
                    "Bad election event - round num"
                );
                expect(_relay_requests.toString()).to.be.equal(
                    "1",
                    "Bad election event - relay requests"
                );
                expect(_min_relays_ok).to.be.equal(
                    false,
                    "Bad election event - min relays"
                );

                const events2 = await stakingRoot
                    .getPastEvents({filter: "RelayRoundInitialized"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num1,
                            round_start_time: _round_start_time,
                            round_end_time: _round_end_time,
                            round_addr: _round_addr,
                            relays_count: _relays_count,
                            duplicate: _duplicate,
                        },
                    },
                ] = events2;

                expect(_round_num1.toString()).to.be.equal(
                    "2",
                    "Bad relay init event - round num"
                );
                expect(_round_addr.toString()).to.be.equal(
                    round.address.toString(),
                    "Bad relay init event - round addr"
                );
                expect(_relays_count.toString()).to.be.equal(
                    "3",
                    "Bad relay init event - relays count"
                );
                expect(_duplicate).to.be.equal(
                    true,
                    "Bad relay init event - duplicate"
                );

                const round_details = await round.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);

                const stored_round_num = round_details.round_num;
                const stored_relays_count = await round.methods
                    .relays_count()
                    .call()
                    .then((t) => t.relays_count);
                const stored_total_tokens_staked = await round.methods
                    .total_tokens_staked()
                    .call()
                    .then((t) => t.total_tokens_staked);
                const stored_reward_round_num = await round.methods
                    .reward_round_num()
                    .call()
                    .then((t) => t.reward_round_num);
                const stored_relays_installed = round_details.relays_installed;
                const stored_duplicate = await round.methods
                    .duplicate()
                    .call()
                    .then((t) => t.duplicate);

                const expected_staked_tokens = userDeposit * 6;

                expect(stored_round_num.toString()).to.be.equal(
                    "2",
                    "Bad round created - round num"
                );
                expect(stored_relays_count.toString()).to.be.equal(
                    "3",
                    "Bad round created - relays count"
                );
                expect(stored_total_tokens_staked.toString()).to.be.equal(
                    expected_staked_tokens.toString(),
                    "Bad round created - total tokens staked"
                );
                expect(stored_reward_round_num.toString()).to.be.equal(
                    "1",
                    "Bad round created - reward round num"
                );
                expect(stored_relays_installed).to.be.equal(
                    true,
                    "Bad round created - relays installed"
                );
                expect(stored_duplicate).to.be.equal(
                    true,
                    "Bad round created - duplicate"
                );

                const round_reward = (await round.methods.round_reward().call()).round_reward;
                const staking_details_1 = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const reward_rounds_new = staking_details_1.rewardRounds;
                // console.log(reward_rounds, reward_rounds_new, round_reward.toString());
                const expected_reward =
                    (new BigNumber(reward_rounds[1].totalReward)).plus(round_reward);
                expect(expected_reward.toString()).to.be.equal(
                    reward_rounds_new[1].totalReward.toString(),
                    "Bad reward after relay round init"
                );

                const relay_rounds_data = await stakingRoot.methods
                    .getRelayRoundsDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => t.value0);
                expect(relay_rounds_data.currentRelayRound.toString()).to.be.equal(
                    "2",
                    "Bad round installed in root"
                );

                // check all relays are installed
                const relays = round_details.staker_addrs.map((i) => i.toString());
                expect(relays.includes(user1.address.toString())).to.be.true;
                expect(relays.includes(user2.address.toString())).to.be.true;
                expect(relays.includes(user3.address.toString())).to.be.true;
            });

            it("Users get reward for prev relay round", async function () {
                await tryIncreaseTime(1000);

                for (const i of [
                    [user1, userTokenWallet1, user1Data, '0'],
                    [user2, userTokenWallet2, user2Data, '1'],
                    [user3, userTokenWallet3, user3Data, '2'],
                ] as const) {
                    const _user: Account = i[0];
                    const _userTokenWallet: Contract<FactorySource["TokenWallet"]> = i[1];
                    const _userData: Contract<FactorySource["UserData"]> = i[2];

                    const relay_round = await getRelayRound(1);
                    const relay = await relay_round.methods
                        .getRelayByStakerAddress({
                            _relay_staker_addr: _user.address,
                            answerId: 0,
                        })
                        .call({ responsible: true });
                    const staked_tokens = new BigNumber(relay._staked_tokens.toString());
                    const total_tokens_staked = (await relay_round.methods
                        .total_tokens_staked()
                        .call()).total_tokens_staked;

                    // deposit 1 token to sync rewards
                    await depositTokens(stakingRoot, _user, _userTokenWallet, 1);
                    if (locklift.context.network.name === "dev") {
                        await tryIncreaseTime(DEV_WAIT);
                    }
                    await tryIncreaseTime(DEV_WAIT);

                    const _user_rewards = await userRewardRounds(_userData);

                    await getRewardForRelayRound(
                        (await locklift.keystore.getSigner(i[3]))!,
                        _userData,
                        1
                    );
                    if (locklift.context.network.name === "dev") {
                        await tryIncreaseTime(DEV_WAIT);
                    }
                    await tryIncreaseTime(DEV_WAIT);

                    const _user_rewards_1 = await userRewardRounds(_userData);

                    const round_reward = rewardPerSec * RELAY_ROUND_TIME_1;
                    const user_share = staked_tokens
                        .times(1e18)
                        .div(total_tokens_staked)
                        .dp(0, 1);
                    const user_reward = user_share.times(round_reward).div(1e18).dp(0, 1);

                    const expected = user_reward.plus(_user_rewards[0].reward_balance);


                    expect(expected.toString()).to.be.equal(
                        _user_rewards_1[0].reward_balance,
                        "Bad reward"
                    );

                    const events2 = await _userData
                        .getPastEvents({filter: "RelayRoundRewardClaimed"})
                        .then((e) => e.events);
                    const [
                        {
                            data: {
                                relay_round_num: _relay_round_num,
                                reward_round_num: _reward_round_num,
                                reward: _reward,
                            },
                        },
                    ] = events2;

                    const expected_reward = user_reward;
                    expect(_relay_round_num.toString()).to.be.equal(
                        "1",
                        "Bad relay round reward event - relay round"
                    );
                    expect(_reward_round_num.toString()).to.be.equal(
                        "0",
                        "Bad relay round reward event - reward round"
                    );
                    expect(_reward.toString()).to.be.equal(
                        expected_reward.toString(),
                        "Bad relay round reward event - reward"
                    );
                }
            });

            it("Slash user", async function () {
                const staking_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);

                let rounds_rewards_data = staking_details.rewardRounds;
                // console.log(rounds_rewards_data);
                const round1_rewards_data = rounds_rewards_data[0];

                const user1_reward_before = await userRewardRounds(user1Data);
                const user1_reward = new BigNumber(
                    user1_reward_before[0].reward_balance
                );
                // console.log(user1_reward);
                const user1_token_reward = Math.floor(
                    (Math.floor((user1_reward * 1e10) / Number(round1_rewards_data.totalReward)) *
                        Number(round1_rewards_data.rewardTokens)) /
                    1e10
                );

                const user1_token_balance0 = Number(await userTokenBalance(user1Data));
                // console.log(user1_token_balance0.toFixed(0));

                const staking_details_before = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);

                const tx = await slashUser(user1);

                const events2 = await stakingRoot
                    .getPastEvents({filter: "RelaySlashed"})
                    .then((e) => e.events);
                const [
                    {
                        data: {user: _user, tokens_withdrawn: _tokens_withdraw},
                    },
                ] = events2;

                const expected_withdraw = user1_token_balance0 + user1_token_reward;
                expect(_tokens_withdraw.toString()).to.be.equal(
                    expected_withdraw.toString(),
                    "Bad slashed reward"
                );

                const staking_details_after = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);

                const prev_token_balance = new BigNumber(
                    staking_details_before.tokenBalance
                );
                const after_token_balance = new BigNumber(
                    staking_details_after.tokenBalance
                );
                expect(prev_token_balance.minus(user1_token_balance0).toString()).to.be.equal(
                    after_token_balance.toString(),
                    "Bad token balance"
                );
            });
        });

        describe("Destroy old relay round", async function () {
            it("Election on new round starts", async function () {
                // await tryIncreaseTime(5000);
                await tryIncreaseTime(5000);

                const tx = await startElection(
                    (await locklift.keystore.getSigner("2"))!
                );
                const election = await getElection(3);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }
                await tryIncreaseTime(DEV_WAIT);

                const round_num = await election.methods
                    .round_num()
                    .call()
                    .then((t) => t.round_num);
                expect(round_num.toString()).to.be.equal(
                    "3",
                    "Bad election - round num"
                );

                const events2 = await stakingRoot
                    .getPastEvents({filter: "ElectionStarted"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num,
                            election_start_time: _election_start_time,
                            election_addr: _election_addr,
                        },
                    },
                ] = events2;

                expect(_round_num.toString()).to.be.equal(
                    "3",
                    "Bad election - round num"
                );
                expect(_election_addr.toString()).to.be.equal(
                    election.address.toString(),
                    "Bad election - address"
                );
            });

            it("Election ends, not enough users participated, clone prev. round", async function () {
                await tryIncreaseTime(5000);

                const staking_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const reward_rounds = staking_details.rewardRounds;
                //
                // const round2 = await getRelayRound(2);
                // const round_details2 = await round2.methods.getDetails({answerId: 0}).call().then(v => v.value0);
                // console.log(round_details2);

                const tx = await endElection((await locklift.keystore.getSigner("0"))!);

                const round = await getRelayRound(3);
                await waitForDeploy(round.address);
                logger.log(`Round 4 deployed - ${round.address}`);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }
                await tryIncreaseTime(DEV_WAIT);

                // const election = await getElection(2);

                // console.log('root', stakingRoot.address)
                // console.log('election', election.address);
                // console.log('round', round.address);

                const events2 = await stakingRoot
                    .getPastEvents({filter: "ElectionEnded"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num,
                            relay_requests: _relay_requests,
                            min_relays_ok: _min_relays_ok,
                        },
                    },
                ] = events2;

                expect(_round_num.toString()).to.be.equal(
                    "3",
                    "Bad election event - round num"
                );
                expect(_relay_requests.toString()).to.be.equal(
                    "0",
                    "Bad election event - relay requests"
                );
                expect(_min_relays_ok).to.be.equal(
                    false,
                    "Bad election event - min relays"
                );

                const events3 = await stakingRoot
                    .getPastEvents({filter: "RelayRoundInitialized"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num1,
                            round_start_time: _round_start_time,
                            round_end_time: _round_end_time,
                            round_addr: _round_addr,
                            relays_count: _relays_count,
                            duplicate: _duplicate,
                        },
                    },
                ] = events3;

                expect(_round_num1.toString()).to.be.equal(
                    "3",
                    "Bad relay init event - round num"
                );
                expect(_round_addr.toString()).to.be.equal(
                    round.address.toString(),
                    "Bad relay init event - round addr"
                );
                expect(_relays_count.toString()).to.be.equal(
                    "3",
                    "Bad relay init event - relays count"
                );
                expect(_duplicate).to.be.equal(
                    true,
                    "Bad relay init event - duplicate"
                );

                const round_details = await round.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);

                const stored_round_num = round_details.round_num;

                const stored_relays_count = await round.methods
                    .relays_count()
                    .call()
                    .then((t) => t.relays_count);
                const stored_total_tokens_staked = await round.methods
                    .total_tokens_staked()
                    .call()
                    .then((t) => t.total_tokens_staked);
                const stored_reward_round_num = await round.methods
                    .reward_round_num()
                    .call()
                    .then((t) => t.reward_round_num);
                const stored_relays_installed = round_details.relays_installed;
                const stored_duplicate = await round.methods
                    .duplicate()
                    .call()
                    .then((t) => t.duplicate);

                const expected_staked_tokens = userDeposit * 6;

                expect(stored_round_num.toString()).to.be.equal(
                    "3",
                    "Bad round created - round num"
                );
                expect(stored_relays_count.toString()).to.be.equal(
                    "3",
                    "Bad round created - relays count"
                );
                expect(stored_total_tokens_staked.toString()).to.be.equal(
                    expected_staked_tokens.toString(),
                    "Bad round created - total tokens staked"
                );
                expect(stored_reward_round_num.toString()).to.be.equal(
                    "1",
                    "Bad round created - reward round num"
                );
                expect(stored_relays_installed).to.be.equal(
                    true,
                    "Bad round created - relays installed"
                );
                expect(stored_duplicate).to.be.equal(
                    true,
                    "Bad round created - duplicate"
                );

                const round_reward = (await round.methods.round_reward().call()).round_reward;
                const staking_details_1 = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const reward_rounds_new = staking_details_1.rewardRounds;
                // console.log(reward_rounds, reward_rounds_new, round_reward.toString());
                const expected_reward = (new BigNumber(reward_rounds[1].totalReward)).plus(round_reward);
                expect(expected_reward.toString()).to.be.equal(
                    reward_rounds_new[1].totalReward.toString(),
                    "Bad reward after relay round init"
                );

                const relay_rounds_data = await stakingRoot.methods
                    .getRelayRoundsDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => t.value0);
                expect(relay_rounds_data.currentRelayRound.toString()).to.be.equal(
                    "3",
                    "Bad round installed in root"
                );

                // check all relays are installed
                const relays = round_details.staker_addrs.map((i) => i.toString());
                expect(relays.includes(user1.address.toString())).to.be.true;
                expect(relays.includes(user2.address.toString())).to.be.true;
                expect(relays.includes(user3.address.toString())).to.be.true;
            });

            it("Check old round destroyed (-2)", async function () {
                const round = await getRelayRound(0);

                const round_bal = await getBalance(round.address);

                expect(round_bal.toFixed(0)).to.be.equal("0", "Round not destroyed");
            });
        });

        describe("Late round start", async function () {
            it("Election on new round starts", async function () {
                // await tryIncreaseTime(5000);
                await tryIncreaseTime(5000);

                const tx = await startElection(
                    (await locklift.keystore.getSigner("2"))!
                );
                const election = await getElection(4);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }
                await tryIncreaseTime(DEV_WAIT);

                const round_num = await election.methods
                    .round_num()
                    .call()
                    .then((t) => t.round_num);
                expect(round_num.toString()).to.be.equal(
                    "4",
                    "Bad election - round num"
                );

                const events3 = await stakingRoot
                    .getPastEvents({filter: "ElectionStarted"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num,
                            election_start_time: _election_start_time,
                            election_addr: _election_addr,
                        },
                    },
                ] = events3;

                expect(_round_num.toString()).to.be.equal(
                    "4",
                    "Bad election - round num"
                );
                expect(_election_addr.toString()).to.be.equal(
                    election.address.toString(),
                    "Bad election - address"
                );
            });

            it("Election ends late, not enough users participated, clone prev. round", async function () {
                // make sure current round ends after prev round end
                // await tryIncreaseTime(RELAY_ROUND_TIME_1 * 1000);
                await tryIncreaseTime(RELAY_ROUND_TIME_1 * 1000);

                const staking_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const reward_rounds = staking_details.rewardRounds;
                //
                // const round2 = await getRelayRound(2);
                // const round_details2 = await round2.methods.getDetails({answerId: 0}).call().then(v => v.value0);
                // console.log(round_details2);

                const root_round_details = await stakingRoot.methods
                    .getRelayRoundsDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => t.value0);

                const tx = await endElection((await locklift.keystore.getSigner("0"))!);

                const round = await getRelayRound(4);
                await waitForDeploy(round.address);
                logger.log(`Round 5 deployed - ${round.address}`);
                if (locklift.context.network.name === "dev") {
                    await tryIncreaseTime(DEV_WAIT);
                }
                await tryIncreaseTime(DEV_WAIT);

                // const election = await getElection(2);

                // console.log('root', stakingRoot.address)
                // console.log('election', election.address);
                // console.log('round', round.address);

                const events3 = await stakingRoot
                    .getPastEvents({filter: "ElectionEnded"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num,
                            relay_requests: _relay_requests,
                            min_relays_ok: _min_relays_ok,
                        },
                    },
                ] = events3;

                expect(_round_num.toString()).to.be.equal(
                    "4",
                    "Bad election event - round num"
                );
                expect(_relay_requests.toString()).to.be.equal(
                    "0",
                    "Bad election event - relay requests"
                );
                expect(_min_relays_ok).to.be.equal(
                    false,
                    "Bad election event - min relays"
                );

                const events = await stakingRoot
                    .getPastEvents({filter: "RelayRoundInitialized"})
                    .then((e) => e.events);
                const [
                    {
                        data: {
                            round_num: _round_num1,
                            round_start_time: _round_start_time,
                            round_end_time: _round_end_time,
                            round_addr: _round_addr,
                            relays_count: _relays_count,
                            duplicate: _duplicate,
                        },
                    },
                ] = events;

                expect(_round_num1.toString()).to.be.equal(
                    "4",
                    "Bad relay init event - round num"
                );
                expect(_round_addr.toString()).to.be.equal(
                    round.address.toString(),
                    "Bad relay init event - round addr"
                );
                expect(_relays_count.toString()).to.be.equal(
                    "3",
                    "Bad relay init event - relays count"
                );
                expect(_duplicate).to.be.equal(
                    true,
                    "Bad relay init event - duplicate"
                );

                const round_details = await round.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);

                const stored_round_num = round_details.round_num;
                const stored_relays_count = await round.methods
                    .relays_count()
                    .call()
                    .then((t) => t.relays_count);
                const stored_total_tokens_staked = await round.methods
                    .total_tokens_staked()
                    .call()
                    .then((t) => t.total_tokens_staked);
                const stored_reward_round_num = await round.methods
                    .reward_round_num()
                    .call()
                    .then((t) => t.reward_round_num);
                const stored_relays_installed = round_details.relays_installed;
                const stored_duplicate = await round.methods
                    .duplicate()
                    .call()
                    .then((t) => t.duplicate);

                const expected_staked_tokens = userDeposit * 6;

                expect(stored_round_num.toString()).to.be.equal(
                    "4",
                    "Bad round created - round num"
                );
                expect(stored_relays_count.toString()).to.be.equal(
                    "3",
                    "Bad round created - relays count"
                );
                expect(stored_total_tokens_staked.toString()).to.be.equal(
                    expected_staked_tokens.toString(),
                    "Bad round created - total tokens staked"
                );
                expect(stored_reward_round_num.toString()).to.be.equal(
                    "1",
                    "Bad round created - reward round num"
                );
                expect(stored_relays_installed).to.be.equal(
                    true,
                    "Bad round created - relays installed"
                );
                expect(stored_duplicate).to.be.equal(
                    true,
                    "Bad round created - duplicate"
                );

                const round_reward = (await round.methods.round_reward().call()).round_reward;
                const staking_details_1 = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const reward_rounds_new = staking_details_1.rewardRounds;
                // console.log(reward_rounds, reward_rounds_new, round_reward.toString());
                const expected_reward = (new BigNumber(reward_rounds[1].totalReward)).plus(round_reward);
                expect(expected_reward.toString()).to.be.equal(
                    reward_rounds_new[1].totalReward.toString(),
                    "Bad reward after relay round init"
                );

                const relay_rounds_data = await stakingRoot.methods
                    .getRelayRoundsDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => t.value0);
                expect(relay_rounds_data.currentRelayRound.toString()).to.be.equal(
                    "4",
                    "Bad round installed in root"
                );

                // check all relays are installed
                const relays = round_details.staker_addrs.map((i) => i.toString());
                expect(relays.includes(user1.address.toString())).to.be.true;
                expect(relays.includes(user2.address.toString())).to.be.true;
                expect(relays.includes(user3.address.toString())).to.be.true;

                const root_round_details_1 = await stakingRoot.methods
                    .getRelayRoundsDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((t) => t.value0);
                expect(
                    Number(root_round_details_1.currentRelayRoundStartTime)
                ).to.be.gt(
                    Number(root_round_details.currentRelayRoundEndTime),
                    "Bad new round start time"
                );
            });
        });

        describe("Emergency situation", async function () {
            it("Set emergency", async function () {
                await setEmergency();
                const details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                expect(details.emergency).to.be.true;
            });

            it("User withdraw tokens", async function () {
                const prev_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                const tx = await withdrawTokens(user2, userDeposit);
                // await tryIncreaseTime(1000);
                await tryIncreaseTime(1000);
                const after_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);

                const expected_bal = Number(prev_details.tokenBalance) - userDeposit;
                expect(Number(after_details.tokenBalance)).to.be.equal(expected_bal);
            });

            it("Rescuer withdraw all tokens", async function () {
                const prev_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                await withdrawEmergency(100, false);
                // await tryIncreaseTime(1000);
                await tryIncreaseTime(1000);
                const after_details = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                expect(Number(after_details.tokenBalance)).to.be.equal(
                    Number(prev_details.tokenBalance) - 100
                );

                await withdrawEmergency(0, true);
                // await tryIncreaseTime(1000);
                await tryIncreaseTime(1000);
                const after_details_2 = await stakingRoot.methods
                    .getDetails({answerId: 0})
                    .call({ responsible: true })
                    .then((v) => v.value0);
                expect(after_details_2.tokenBalance).to.be.equal("0");
                expect(after_details_2.rewardTokenBalance).to.be.equal("0");
            });
        });
    });
});
