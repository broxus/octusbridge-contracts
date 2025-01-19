import {tryIncreaseTime} from "../utils/time";

export {};

import {FactorySource, StakingV1_2Abi} from "../../build/factorySource";
import {Contract} from "locklift";
import {Account} from "everscale-standalone-client/nodejs";

import {deployAccount} from "../utils/account";
import {deployTokenRoot, depositTokens, mintTokens} from "../utils/token";
import {expect} from "chai";

const logger = require("mocha-logger");

let stakingRoot: Contract<FactorySource["StakingV1_2"]>;
let stakingToken: Contract<FactorySource["TokenRoot"]>;
let stakingWallet: Contract<FactorySource["TokenWallet"]>;

let user1: Account;
let user1Data: Contract<FactorySource["UserData"]>;
let user2: Account;
let user2Data: Contract<FactorySource["UserData"]>;
let stakingOwner: Account;
let userTokenWallet1: Contract<FactorySource["TokenWallet"]>;
let userTokenWallet2: Contract<FactorySource["TokenWallet"]>;
let ownerWallet: Contract<FactorySource["TokenWallet"]>;
let userInitialTokenBal = 100000;
let rewardTokensBal = 10000;
let userDeposit = 100;
let rewardPerSec = 1000000;
let user1Balance: number;
let user2Balance: number;
let balance_err: number;

type UserRewardDataParam = Parameters<
  Contract<StakingV1_2Abi>["methods"]["pendingReward"]
>[0]["user_reward_data"];

describe("Test Staking Rewards", async function () {
  this.timeout(10000000);

  const userRewardRounds = async function (
    userData: Contract<FactorySource["UserData"]>
  ) {
    return await userData.methods
      .getDetails({ answerId: 0 })
      .call()
      .then((v) => v.value0.rewardRounds);
  };

  const userTokenBalance = async function (
    userData: Contract<FactorySource["UserData"]>
  ) {
    return await userData.methods
      .getDetails({ answerId: 0 })
      .call()
      .then((v) => v.value0.token_balance.toString());
  };

  const pendingReward = async function (
    user_token_balance: string,
    user_reward_rounds: UserRewardDataParam
  ) {
    return await stakingRoot.methods
      .pendingReward({
        user_token_balance: user_token_balance,
        user_reward_data: user_reward_rounds,
        answerId: 0,
      })
      .call()
      .then((v) => v.value0);
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
      .getDetails({ answerId: 0 })
      .call()
      .then((v) => v.value0);

    const _pool_wallet_bal = await stakingWallet.methods
      .balance({ answerId: 0 })
      .call()
      .then((v) => v.value0);
    const _pool_bal = staking_details.tokenBalance;
    const _pool_reward_bal = staking_details.rewardTokenBalance;

    const _user_bal = await userTokenWallet.methods
      .balance({ answerId: 0 })
      .call()
      .then((t) => t.value0);
    const user_data = await userAccount.methods
      .getDetails({ answerId: 0 })
      .call();
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
    return await locklift.tracing.trace(
      stakingRoot.methods
        .startNewRewardRound({
          send_gas_to: stakingOwner.address,
        })
        .send({
          from: stakingOwner.address,
          amount: locklift.utils.toNano(11),
        })
    );
  };

  const claimReward = async function (user: Account) {
    return await locklift.tracing.trace(
      stakingRoot.methods
        .claimReward({
          send_gas_to: user.address,
        })
        .send({
          from: user.address,
          amount: locklift.utils.toNano(11),
        })
    );
  };

  const checkReward = async function (
    userData: Contract<FactorySource["UserData"]>,
    prevRewData: any,
    prevRewardTime: number,
    newRewardTime: number
  ) {
    const user_data = await userData.methods
      .getDetails({ answerId: 0 })
      .call()
      .then((v) => v.value0);
    const user_rew_after = user_data.rewardRounds;
    const user_rew_balance_before = prevRewData[0].reward_balance;
    const user_rew_balance_after = parseInt(
      user_rew_after[0].reward_balance,
      10
    );

    const reward = user_rew_balance_after - user_rew_balance_before;

    const time_passed = newRewardTime - prevRewardTime;
    const expected_reward = rewardPerSec * time_passed;

    expect(reward).to.be.equal(expected_reward, "Bad reward");
  };

  const getUserDataAccount = async function (_user: Account) {
    return await locklift.factory.getDeployedContract(
      "UserData",
      await stakingRoot.methods
        .getUserDataAddress({user: _user.address, answerId: 0})
        .call()
        .then((t) => t.value0)
    );
  };

  const withdrawTokens = async function (
    user: Account,
    withdraw_amount: number
  ) {
    return await locklift.tracing.trace(
      stakingRoot.methods
        .withdraw({
          amount: withdraw_amount,
          send_gas_to: user.address,
        })
        .send({
          from: user.address,
          amount: locklift.utils.toNano(11),
        })
    );
  };

  describe("Setup contracts", async function () {
    describe("Token", async function () {
      it("Deploy admin", async function () {
        const signer0 = (await locklift.keystore.getSigner("0"))!;
        stakingOwner = await deployAccount(signer0, 50);
      });

      it("Deploy root", async function () {
        stakingToken = await deployTokenRoot("Farm token", "FT", 9, stakingOwner.address);
      });
    });

    describe("Users", async function () {
      it("Deploy users accounts", async function () {
        let users = [];
        for (const i of [1, 2]) {
          const signer = (await locklift.keystore.getSigner(i.toString()))!;
          const account = await deployAccount(signer, 25);
          logger.log(`User address: ${account.address}`);

          // const isDeployed = await locklift.provider
          //   .getFullContractState({ address: account.address })
          //   .then((res) => res.state?.isDeployed);
          //
          // expect(isDeployed).to.be.true;
          users.push(account);
        }
        [user1, user2] = users;
      });

      it("Deploy users token wallets + mint", async function () {
        [userTokenWallet1, userTokenWallet2, ownerWallet] = await mintTokens(
          stakingOwner,
          [user1, user2, stakingOwner],
          stakingToken,
          userInitialTokenBal
        );

        const balance1 = await userTokenWallet1.methods
          .balance({ answerId: 0 })
          .call()
          .then((t) => parseInt(t.value0, 10));
        const balance2 = await userTokenWallet2.methods
          .balance({ answerId: 0 })
          .call()
          .then((t) => parseInt(t.value0, 10));
        const balance3 = await ownerWallet.methods
          .balance({ answerId: 0 })
          .call()
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
      });
    });

    describe("Staking", async function () {
      it("Deploy staking", async function () {
        const signer = (await locklift.keystore.getSigner("0"))!;

        const { contract: ton_config_mockup } =
          await locklift.factory.deployContract({
            contract: "TonConfigMockup",
            constructorParams: {},
            initParams: { nonce: locklift.utils.getRandomNonce() },
            publicKey: signer.publicKey,
            value: locklift.utils.toNano(1),
          });

        const { contract: sol_config_mockup } =
          await locklift.factory.deployContract({
            contract: "SolConfigMockup",
            constructorParams: {},
            initParams: { nonce: locklift.utils.getRandomNonce() },
            publicKey: signer.publicKey,
            value: locklift.utils.toNano(1),
          });

        const stakingRootData = await locklift.factory.getContractArtifacts(
          "StakingV1_2"
        );
        const { contract: stakingRootDeployer } =
          await locklift.tracing.trace(
            locklift.factory.deployContract({
              contract: "StakingRootDeployer",
              constructorParams: {},
              initParams: {
                nonce: locklift.utils.getRandomNonce(),
                stakingCode: stakingRootData.code,
              },
              publicKey: signer.publicKey,
              value: locklift.utils.toNano(55),
            })
          );

        logger.log(`Deploying stakingRoot`);
        let { output: address } = await stakingRootDeployer.methods
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

        stakingRoot = await locklift.factory.getDeployedContract(
          "StakingV1_2",
          address?.value0!
        );

        logger.log(`StakingRoot address: ${stakingRoot.address}`);
        logger.log(`StakingRoot owner address: ${stakingOwner.address}`);
        logger.log(`StakingRoot token root address: ${stakingToken.address}`);

        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        logger.log(`Staking token wallet: ${staking_details.tokenWallet}`);

        stakingWallet = await locklift.factory.getDeployedContract(
          "TokenWallet",
          staking_details.tokenWallet
        );

        // call in order to check if wallet is deployed
        const owner_address = await stakingWallet.methods
          .owner({ answerId: 0 })
          .call();
        const root_address = await stakingWallet.methods
          .root({ answerId: 0 })
          .call();
        expect(owner_address.value0.toString()).to.be.equal(
          stakingRoot.address.toString(),
          "Wrong staking token wallet owner"
        );
        expect(root_address.value0.toString()).to.be.equal(
          stakingToken.address.toString(),
          "Wrong staking token wallet root"
        );
      });

      it("Installing codes", async function () {
        const UserData = await locklift.factory.getContractArtifacts(
          "UserData"
        );
        const Election = await locklift.factory.getContractArtifacts(
          "Election"
        );
        const RelayRound = await locklift.factory.getContractArtifacts(
          "StakingRelayRound"
        );
        const Platform = await locklift.factory.getContractArtifacts(
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
            amount: locklift.utils.toNano(11),
          });
        logger.log(`Installing UserData code`);
        await stakingRoot.methods
          .installOrUpdateUserDataCode({
            code: UserData.code,
            send_gas_to: stakingOwner.address,
          })
          .send({
            from: stakingOwner.address,
            amount: locklift.utils.toNano(11),
          });
        logger.log(`Installing ElectionCode code`);
        await stakingRoot.methods
          .installOrUpdateElectionCode({
            code: Election.code,
            send_gas_to: stakingOwner.address,
          })
          .send({
            from: stakingOwner.address,
            amount: locklift.utils.toNano(11),
          });
        logger.log(`Installing RelayRoundCode code`);
        await stakingRoot.methods
          .installOrUpdateRelayRoundCode({
            code: RelayRound.code,
            send_gas_to: stakingOwner.address,
          })
          .send({
            from: stakingOwner.address,
            amount: locklift.utils.toNano(11),
          });
        logger.log(`Set staking to Active`);
        await stakingRoot.methods
          .setActive({
            new_active: true,
            send_gas_to: stakingOwner.address,
          })
          .send({
            from: stakingOwner.address,
            amount: locklift.utils.toNano(11),
          });

        const active = await stakingRoot.methods
          .isActive({ answerId: 0 })
          .call()
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

        const staking_balance = await stakingWallet.methods
          .balance({ answerId: 0 })
          .call()
          .then((t) => t.value0);

        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const staking_balance_stored = staking_details.rewardTokenBalance;

        expect(staking_balance).to.be.equal(
          amount.toString(),
          "Farm pool balance empty"
        );
        expect(staking_balance_stored.toString()).to.be.equal(
          amount.toString(),
          "Farm pool balance not recognized"
        );
      });
    });
  });

  describe("Basic staking pipeline", async function () {
    describe("1 user farming", async function () {
      it("Deposit tokens", async function () {
        await depositTokens(stakingRoot, user1, userTokenWallet1, userDeposit);
        user1Data = await getUserDataAccount(user1);

        await checkTokenBalances(
          userTokenWallet1,
          user1Data,
          rewardTokensBal + userDeposit,
          userDeposit,
          rewardTokensBal,
          userInitialTokenBal - userDeposit,
          userDeposit
        );

        const events = await stakingRoot
          .getPastEvents({ filter: "Deposit" })
          .then((e) => e.events);
        const [
          {
            data: { user: _user, amount: _amount },
          },
        ] = events;

        expect(_user.toString()).to.be.equal(
          user1.address.toString(),
          "Bad event"
        );
        expect(_amount).to.be.equal(userDeposit.toString(), "Bad event");
      });

      it("Deposit 2nd time", async function () {
        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const prev_reward_time = staking_details.lastRewardTime;

        const user1_data = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const user1_rew_before = user1_data.rewardRounds;

        await depositTokens(stakingRoot, user1, userTokenWallet1, userDeposit);

        await checkTokenBalances(
          userTokenWallet1,
          user1Data,
          rewardTokensBal + userDeposit * 2,
          userDeposit * 2,
          rewardTokensBal,
          userInitialTokenBal - userDeposit * 2,
          userDeposit * 2
        );

        const staking_details_1 = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const new_reward_time = staking_details_1.lastRewardTime;
        await checkReward(
          user1Data,
          user1_rew_before,
          parseInt(prev_reward_time, 10),
          parseInt(new_reward_time, 10)
        );

        const events = await stakingRoot
          .getPastEvents({ filter: "Deposit" })
          .then((e) => e.events);
        const [
          {
            data: { user: _user, amount: _amount },
          },
        ] = events;
        expect(_user.toString()).to.be.equal(
          user1.address.toString(),
          "Bad event"
        );
        expect(_amount.toString()).to.be.equal(
          userDeposit.toString(),
          "Bad event"
        );
      });

      it("User withdraw half of staked amount", async function () {
        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const prev_reward_time = staking_details.lastRewardTime;

        const user1_data = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const user1_rew_before = user1_data.rewardRounds;

        await withdrawTokens(user1, userDeposit);
        await checkTokenBalances(
          userTokenWallet1,
          user1Data,
          rewardTokensBal + userDeposit,
          userDeposit,
          rewardTokensBal,
          userInitialTokenBal - userDeposit,
          userDeposit
        );

        const staking_details_1 = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const new_reward_time = staking_details_1.lastRewardTime;
        await checkReward(
          user1Data,
          user1_rew_before,
          parseInt(prev_reward_time, 10),
          parseInt(new_reward_time, 10)
        );

        const events = await stakingRoot
          .getPastEvents({ filter: "Withdraw" })
          .then((e) => e.events);
        const [
          {
            data: { user: _user, amount: _amount },
          },
        ] = events;
        expect(_user.toString()).to.be.equal(
          user1.address.toString(),
          "Bad event"
        );
        expect(_amount.toString()).to.be.equal(
          userDeposit.toString(),
          "Bad event"
        );
      });

      it("User withdraw other half", async function () {
        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const prev_reward_time = staking_details.lastRewardTime;

        const user1_data = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const user1_rew_before = user1_data.rewardRounds;

        await withdrawTokens(user1, userDeposit);

        const staking_details_1 = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const new_reward_time = staking_details_1.lastRewardTime;
        await checkReward(
          user1Data,
          user1_rew_before,
          parseInt(prev_reward_time, 10),
          parseInt(new_reward_time, 10)
        );

        await checkTokenBalances(
          userTokenWallet1,
          user1Data,
          rewardTokensBal,
          0,
          rewardTokensBal,
          userInitialTokenBal,
          0
        );
        const events = await stakingRoot
          .getPastEvents({ filter: "Withdraw" })
          .then((e) => e.events);
        const [
          {
            data: { user: _user, amount: _amount },
          },
        ] = events;
        expect(_user.toString()).to.be.equal(
          user1.address.toString(),
          "Bad event"
        );
        expect(_amount.toString()).to.be.equal(
          userDeposit.toString(),
          "Bad event"
        );
      });
    });

    describe("Multiple users farming 1 round", async function () {
      let user1_deposit_time: string;
      let user2_deposit_time: string;
      let user1_withdraw_time: string;
      let user2_withdraw_time: string;

      it("Users deposit tokens", async function () {
        await depositTokens(stakingRoot, user1, userTokenWallet1, userDeposit);
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
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        user1_deposit_time = staking_details.lastRewardTime;

        await tryIncreaseTime(5000);
        await depositTokens(stakingRoot, user2, userTokenWallet2, userDeposit);
        user2Data = await getUserDataAccount(user2);

        await checkTokenBalances(
          userTokenWallet2,
          user2Data,
          rewardTokensBal + userDeposit * 2,
          userDeposit * 2,
          rewardTokensBal,
          userInitialTokenBal - userDeposit,
          userDeposit
        );

        const staking_details_1 = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        user2_deposit_time = staking_details_1.lastRewardTime;
      });

      it("Users withdraw tokens", async function () {
        const user1_data = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const user1_rew_before = user1_data.rewardRounds;

        await withdrawTokens(user1, userDeposit);

        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        user1_withdraw_time = staking_details.lastRewardTime;

        const user1_data_1 = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const user1_rew_after = user1_data_1.rewardRounds;

        const reward1 =
          parseInt(user1_rew_after[0].reward_balance, 10) -
          parseInt(user1_rew_before[0].reward_balance, 10);

        const time_passed_1 =
          parseInt(user2_deposit_time, 10) - parseInt(user1_deposit_time, 10);
        const expected_reward_1 = rewardPerSec * time_passed_1;

        const time_passed_2 =
          parseInt(user1_withdraw_time, 10) - parseInt(user2_deposit_time, 10);
        const expected_reward_2 = rewardPerSec * 0.5 * time_passed_2;

        const expected_reward_final = expected_reward_1 + expected_reward_2;

        expect(reward1).to.be.equal(
          expected_reward_final,
          "Bad reward 1 user (low)"
        );

        await checkTokenBalances(
          userTokenWallet1,
          user1Data,
          rewardTokensBal + userDeposit,
          userDeposit,
          rewardTokensBal,
          userInitialTokenBal,
          0
        );

        const user2_rew_before = await userRewardRounds(user2Data);
        await withdrawTokens(user2, userDeposit);

        const user2_rew_after = await userRewardRounds(user2Data);
        const staking_details_1 = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        user2_withdraw_time = staking_details_1.lastRewardTime;

        const reward2 =
          parseInt(user2_rew_after[0].reward_balance, 10) -
          parseInt(user2_rew_before[0].reward_balance, 10);

        const time_passed_21 =
          parseInt(user1_withdraw_time, 10) - parseInt(user2_deposit_time, 10);
        const expected_reward_21 = rewardPerSec * 0.5 * time_passed_21;

        const time_passed_22 =
          parseInt(user2_withdraw_time, 10) - parseInt(user1_withdraw_time, 10);
        const expected_reward_22 = rewardPerSec * time_passed_22;
        const expected_reward_final_2 = expected_reward_22 + expected_reward_21;

        expect(reward2).to.be.equal(
          expected_reward_final_2,
          "Bad reward 2 user (low)"
        );

        await checkTokenBalances(
          userTokenWallet2,
          user2Data,
          rewardTokensBal,
          0,
          rewardTokensBal,
          userInitialTokenBal,
          0
        );
      });

      it("Claim rewards (expect fail)", async function () {
        await tryIncreaseTime(1000);
        const user1_data = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const user1_reward_before = user1_data.rewardRounds;

        const {traceTree} = await claimReward(user1);
        await checkTokenBalances(
          userTokenWallet1,
          user1Data,
          rewardTokensBal,
          0,
          rewardTokensBal,
          userInitialTokenBal,
          0
        );

        const user1_data_1 = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const user1_reward_after = user1_data_1.rewardRounds;
        expect(user1_reward_before[0].reward_balance).to.be.equal(
          user1_reward_after[0].reward_balance,
          "Claim reward fail"
        );

        const user2_reward_before = await userRewardRounds(user2Data);

        await claimReward(user2);
        await checkTokenBalances(
          userTokenWallet1,
          user2Data,
          rewardTokensBal,
          0,
          rewardTokensBal,
          userInitialTokenBal,
          0
        );

        const user2_reward_after = await userRewardRounds(user2Data);
        expect(user2_reward_before[0].reward_balance).to.be.equal(
          user2_reward_after[0].reward_balance,
          "Claim reward fail"
        );
      });

      it("New reward round starts", async function () {
        await tryIncreaseTime(5000);
        await startNewRewardRound();

        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
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

      it("Claim rewards", async function () {
        await tryIncreaseTime(5000);
        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);

        let rounds_rewards_data = staking_details.rewardRounds;
        const round1_rewards_data = rounds_rewards_data[0];

        const user1_reward_before = await userRewardRounds(user1Data);
        const user2_reward_before = await userRewardRounds(user2Data);

        const user1_reward = user1_reward_before[0];
        const user2_reward = user2_reward_before[0];

        const user1_token_reward = Math.floor(
          (Math.floor(
            (parseInt(user1_reward.reward_balance, 10) * 1e10) /
              parseInt(round1_rewards_data.totalReward, 10)
          ) *
            parseInt(round1_rewards_data.rewardTokens, 10)) /
            1e10
        );
        const user2_token_reward = Math.floor(
          (Math.floor(
            (parseInt(user2_reward.reward_balance, 10) * 1e10) /
              parseInt(round1_rewards_data.totalReward, 10)
          ) *
            parseInt(round1_rewards_data.rewardTokens, 10)) /
            1e10
        );

        await tryIncreaseTime(5000);
        const user1_token_balance0 = await userTokenBalance(user1Data);

        const res0 = await pendingReward(
          user1_token_balance0,
          user1_reward_before
        );
        expect(res0.toString()).to.be.eq(
          user1_token_reward.toString(),
          "Bad pending reward"
        );

        const user2_token_balance0 = await userTokenBalance(user2Data);
        const res20 = await pendingReward(
          user2_token_balance0,
          user2_reward_before
        );
        expect(res20.toString()).to.be.eq(
          user2_token_reward.toString(),
          "Bad pending reward"
        );

        await claimReward(user1);
        await checkTokenBalances(
          userTokenWallet1,
          user1Data,
          rewardTokensBal - user1_token_reward,
          0,
          rewardTokensBal - user1_token_reward,
          userInitialTokenBal + user1_token_reward,
          0
        );
        user1Balance = userInitialTokenBal + user1_token_reward;

        const user1_data_2 = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const user1_token_balance = user1_data_2.token_balance;

        const res = await pendingReward(
          user1_token_balance,
          user1_reward_before
        );
        expect(res.toString()).to.be.eq(
          user1_token_reward.toString(),
          "Bad pending reward"
        );

        const user1_data_3 = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const user1_reward_after = user1_data_3.rewardRounds;

        expect(user1_reward_after[0].reward_balance).to.be.equal(
          "0",
          "Claim reward fail"
        );

        const remaining_balance =
          rewardTokensBal - user1_token_reward - user2_token_reward;
        await claimReward(user2);
        await checkTokenBalances(
          userTokenWallet2,
          user2Data,
          remaining_balance,
          0,
          remaining_balance,
          userInitialTokenBal + user2_token_reward,
          0
        );
        user2Balance = userInitialTokenBal + user2_token_reward;
        balance_err = remaining_balance;

        const user2_token_balance = await userTokenBalance(user2Data);
        const res1 = await pendingReward(
          user2_token_balance,
          user2_reward_before
        );
        expect(res1.toString()).to.be.eq(
          user2_token_reward.toString(),
          "Bad pending reward"
        );

        const user2_reward_after = await userRewardRounds(user2Data);
        expect(user2_reward_after[0].reward_balance).to.be.equal(
          "0",
          "Claim reward fail"
        );
      });
    });

    describe("Multiple users farming several rounds", async function () {
      let round2_start_time: string;
      let round2_user1_share: number;
      let round2_user2_share: number;

      it("Deposit reward", async function () {
        await depositTokens(
          stakingRoot,
          stakingOwner,
          ownerWallet,
          rewardTokensBal,
          true
        );
        const staking_balance = await stakingWallet.methods
          .balance({ answerId: 0 })
          .call()
          .then((t) => t.value0);

        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);

        const staking_reward_balance_stored =
          staking_details.rewardTokenBalance;
        const staking_balance_stored = staking_details.tokenBalance;

        // console.log(staking_balance.toString(), staking_reward_balance_stored.toString(), staking_balance_stored.toString())

        const realRewardTokensBal = rewardTokensBal + balance_err;
        expect(staking_balance.toString()).to.be.equal(
          realRewardTokensBal.toString(),
          "Farm pool balance empty"
        );
        expect(staking_reward_balance_stored.toString()).to.be.equal(
          realRewardTokensBal.toString(),
          "Farm pool reward balance not recognized"
        );
        expect(staking_balance_stored.toString()).to.be.equal(
          "0",
          "Farm pool reward balance not recognized"
        );

        const staking_details_1 = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const reward_rounds = staking_details_1.rewardRounds;
        const cur_round = reward_rounds[1];

        expect(cur_round.rewardTokens).to.be.equal(
          rewardTokensBal.toString(),
          "Bad reward rounds balance"
        );
        expect(cur_round.totalReward).to.be.equal(
          "0",
          "Bad reward rounds reward"
        );
      });

      it("User 1 deposit", async function () {
        await tryIncreaseTime(1000);
        await depositTokens(stakingRoot, user1, userTokenWallet1, userDeposit);
        const realRewardTokensBal = rewardTokensBal + balance_err;
        await checkTokenBalances(
          userTokenWallet1,
          user1Data,
          realRewardTokensBal + userDeposit,
          userDeposit,
          realRewardTokensBal,
          user1Balance - userDeposit,
          userDeposit
        );
        user1Balance -= userDeposit;
      });

      it("New reward round starts", async function () {
        await tryIncreaseTime(5000);
        await startNewRewardRound();

        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);

        const reward_rounds = staking_details.rewardRounds;
        const last_reward_time = staking_details.lastRewardTime;
        const cur_round = reward_rounds[2];

        round2_start_time = last_reward_time;

        expect(reward_rounds.length).to.be.equal(3, "Bad reward rounds");
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

      it("Deposit reward", async function () {
        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const last_reward_time = staking_details.lastRewardTime;

        await depositTokens(
          stakingRoot,
          stakingOwner,
          ownerWallet,
          rewardTokensBal,
          true
        );
        const staking_balance = await stakingWallet.methods
          .balance({ answerId: 0 })
          .call()
          .then((t) => t.value0);

        const staking_details_1 = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const staking_reward_balance_stored =
          staking_details_1.rewardTokenBalance;
        const staking_balance_stored = staking_details_1.tokenBalance;

        const expected_balance =
          rewardTokensBal * 2 + userDeposit + balance_err;
        const expected_reward_balance = rewardTokensBal * 2 + balance_err;
        expect(staking_balance.toString()).to.be.equal(
          expected_balance.toString(),
          "Farm pool balance empty"
        );
        expect(staking_reward_balance_stored.toString()).to.be.equal(
          expected_reward_balance.toString(),
          "Farm pool reward balance not recognized"
        );
        expect(staking_balance_stored.toString()).to.be.equal(
          userDeposit.toString(),
          "Farm pool reward balance not recognized"
        );

        const staking_details_2 = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const reward_rounds = staking_details_2.rewardRounds;
        const cur_round = reward_rounds[2];

        const staking_details_3 = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const last_reward_time_2 = staking_details_3.lastRewardTime;
        const expected_reward =
          (parseInt(last_reward_time_2, 10) - parseInt(last_reward_time, 10)) *
          rewardPerSec;
        expect(cur_round.rewardTokens).to.be.equal(
          rewardTokensBal.toString(),
          "Bad reward rounds balance"
        );
        expect(cur_round.totalReward).to.be.equal(
          expected_reward.toString(),
          "Bad reward rounds reward"
        );
      });

      it("User 2 deposit", async function () {
        await depositTokens(stakingRoot, user2, userTokenWallet2, userDeposit);
        await checkTokenBalances(
          userTokenWallet2,
          user2Data,
          rewardTokensBal * 2 + userDeposit * 2 + balance_err,
          userDeposit * 2,
          rewardTokensBal * 2 + balance_err,
          user2Balance - userDeposit,
          userDeposit
        );
        user2Balance = user2Balance - userDeposit;

        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const last_reward_time = staking_details.lastRewardTime;
        const time_passed =
          parseInt(last_reward_time, 10) - parseInt(round2_start_time, 10);
        round2_user1_share = time_passed * rewardPerSec;
      });

      it("New reward round starts", async function () {
        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const prev_reward_time = staking_details.lastRewardTime;
        await tryIncreaseTime(5000);
        await startNewRewardRound();
        await tryIncreaseTime(5000);

        const staking_details_1 = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const reward_rounds = staking_details_1.rewardRounds;
        const last_reward_time = staking_details_1.lastRewardTime;
        const cur_round = reward_rounds[3];

        const time_passed =
          parseInt(last_reward_time, 10) - parseInt(prev_reward_time, 10);
        round2_user1_share += time_passed * (rewardPerSec / 2);
        round2_user2_share = time_passed * (rewardPerSec / 2);

        expect(reward_rounds.length).to.be.equal(4, "Bad reward rounds");
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

        const user1_data = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const user1_reward_before = user1_data.rewardRounds;
        const user1_token_balance0 = user1_data.token_balance;
        // just check that function dont throw overflow and etc. when userData is not synced with latest rounds
        await pendingReward(user1_token_balance0, user1_reward_before);
      });

      it("Users withdraw tokens", async function () {
        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const reward_rounds = staking_details.rewardRounds;

        const user1_details = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        var user1_data = user1_details.rewardRounds;

        var user2_data = await userRewardRounds(user2Data);

        expect(user1_data.length).to.be.equal(2, "Bad user1 data length");
        expect(user2_data.length).to.be.equal(3, "Bad user2 data length");

        expect(user1_data[1].reward_balance).to.be.equal(
          "0",
          "Bad user1 round reward"
        );
        expect(user2_data[2].reward_balance).to.be.equal(
          "0",
          "Bad user2 round reward"
        );

        await withdrawTokens(user1, userDeposit);
        await checkTokenBalances(
          userTokenWallet1,
          user1Data,
          rewardTokensBal * 2 + userDeposit + balance_err,
          userDeposit,
          rewardTokensBal * 2 + balance_err,
          user1Balance + userDeposit,
          0
        );
        user1Balance += userDeposit;

        await withdrawTokens(user2, userDeposit);
        await checkTokenBalances(
          userTokenWallet2,
          user2Data,
          rewardTokensBal * 2 + balance_err,
          0,
          rewardTokensBal * 2 + balance_err,
          user2Balance + userDeposit,
          0
        );
        user2Balance = user2Balance + userDeposit;

        const user1_details_1 = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        user1_data = user1_details_1.rewardRounds;

        user2_data = await userRewardRounds(user2Data);

        expect(user1_data.length).to.be.equal(4, "Bad user1 data length");
        expect(user2_data.length).to.be.equal(4, "Bad user2 data length");

        const round1_reward = reward_rounds[1].totalReward;

        expect(user1_data[1].reward_balance).to.be.equal(
          round1_reward.toString(),
          "Bad user1 round reward"
        );
        expect(user2_data[1].reward_balance).to.be.equal(
          "0",
          "Bad user2 round reward"
        );

        expect(user1_data[2].reward_balance).to.be.equal(
          round2_user1_share.toString(),
          "Bad user1 round reward"
        );
        expect(user2_data[2].reward_balance).to.be.equal(
          round2_user2_share.toString(),
          "Bad user2 round reward"
        );
      });

      it("Users claim tokens", async function () {
        await tryIncreaseTime(5000);

        const staking_details = await stakingRoot.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        let reward_rounds = staking_details.rewardRounds;

        const user1_data = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const user1_reward_data = user1_data.rewardRounds;

        const user2_reward_data = await userRewardRounds(user2Data);

        var user1_expected_token_reward = 0,
          user2_expected_token_reward = 0;
        for (const i of [...Array(reward_rounds.length).keys()]) {
          const user1_round_reward = parseInt(
            user1_reward_data[i].reward_balance,
            10
          );
          const user2_round_reward = parseInt(
            user2_reward_data[i].reward_balance,
            10
          );

          const user1_token_reward = Math.floor(
            (Math.floor(
              (user1_round_reward * 1e10) /
                parseInt(reward_rounds[i].totalReward, 10)
            ) *
              parseInt(reward_rounds[i].rewardTokens, 10)) /
              1e10
          );
          const user2_token_reward = Math.floor(
            (Math.floor(
              (user2_round_reward * 1e10) /
                parseInt(reward_rounds[i].totalReward, 10)
            ) *
              parseInt(reward_rounds[i].rewardTokens, 10)) /
              1e10
          );
          
          user1_expected_token_reward += user1_token_reward;
          user2_expected_token_reward += user2_token_reward;
        }

        const user1_data_1 = await user1Data.methods
          .getDetails({ answerId: 0 })
          .call()
          .then((v) => v.value0);
        const user1_token_balance = user1_data_1.token_balance;

        logger.log(JSON.stringify(user1_reward_data));
        logger.log(JSON.stringify(user1_token_balance));

        const res = await pendingReward(user1_token_balance, user1_reward_data);
        expect(res.toString()).to.be.eq(
          user1_expected_token_reward.toString(),
          "Bad pending reward"
        );

        const user2_token_balance = await userTokenBalance(user2Data);
        const res1 = await pendingReward(
          user2_token_balance,
          user2_reward_data
        );
        expect(res1.toString()).to.be.eq(
          user2_expected_token_reward.toString(),
          "Bad pending reward"
        );

        await claimReward(user1);
        await checkTokenBalances(
          userTokenWallet1,
          user1Data,
          rewardTokensBal * 2 - user1_expected_token_reward + balance_err,
          0,
          rewardTokensBal * 2 - user1_expected_token_reward + balance_err,
          user1Balance + user1_expected_token_reward,
          0
        );
        user1Balance += user1_expected_token_reward;

        const remaining_balance =
          rewardTokensBal * 2 +
          balance_err -
          user1_expected_token_reward -
          user2_expected_token_reward;
        await claimReward(user2);
        await checkTokenBalances(
          userTokenWallet2,
          user2Data,
          remaining_balance,
          0,
          remaining_balance,
          user2Balance + user2_expected_token_reward,
          0
        );
        user2Balance += user2_expected_token_reward;
        balance_err = remaining_balance;
      });
    });
  });
});
