export {};

import { FactorySource } from "../../build/factorySource";
import { Address, Contract, Signer } from "locklift";
import { Account } from "everscale-standalone-client/nodejs";

const {
  deployAccount,
  deployTokenRoot,
  mintTokens,
  logger,
  sleep,
} = require("../utils");

import { expect } from "chai";

const BigNumber = require("bignumber.js");

let stakingRoot: Contract<FactorySource["StakingV1_2"]>;
let stakingToken: Contract<FactorySource["TokenRoot"]>;
let stakingWallet: Contract<FactorySource["TokenWallet"]>;


let user1: Account;
let user2: Account;
let user3: Account;
let stakingOwner: Account;
let userTokenWallet1: Contract<FactorySource["TokenWallet"]>;
let userTokenWallet2: Contract<FactorySource["TokenWallet"]>;
let userTokenWallet3: Contract<FactorySource["TokenWallet"]>;
let ownerWallet: Contract<FactorySource["TokenWallet"]>;
let userInitialTokenBal = 100000;

const DEV_WAIT = 100000;

const RELAY_INITIAL_DEPOSIT = 500;

describe("Test Staking Upgrade", async function () {
  this.timeout(10000000);

  describe("Setup contracts", async function () {
    describe("Token", async function () {
      it("Deploy admin", async function () {
        const signer = (await locklift.keystore.getSigner("3"))!;
        stakingOwner = await deployAccount(signer, RELAY_INITIAL_DEPOSIT + 100);
      });

      it("Deploy root", async function () {
        stakingToken = await deployTokenRoot("Farm token", "FT", stakingOwner);
      });
    });

    describe("Users", async function () {
      it("Deploy users accounts", async function () {
        let users = [];
        for (const i of [0, 1, 2]) {
          const keyPair = await locklift.keystore.getSigner(i.toString());
          const account = await deployAccount(
            keyPair,
            RELAY_INITIAL_DEPOSIT + 50
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
          .balance({ answerId: 0 })
          .call()
          .then((t) => parseInt(t.value0, 10));
        const balance2 = await userTokenWallet2.methods
          .balance({ answerId: 0 })
          .call()
          .then((t) => parseInt(t.value0, 10));
        const balance3 = await userTokenWallet3.methods
          .balance({ answerId: 0 })
          .call()
          .then((t) => parseInt(t.value0, 10));
        const balance4 = await ownerWallet.methods
          .balance({ answerId: 0 })
          .call()
          .then((t) => parseInt(t.value0, 10));

        expect(balance1).to.be.equal(
          userInitialTokenBal,
          "User  token wallet empty"
        );
        expect(balance2).to.be.equal(
          userInitialTokenBal,
          "User  token wallet empty"
        );
        expect(balance3).to.be.equal(
          userInitialTokenBal,
          "User  token wallet empty"
        );
        expect(balance4).to.be.equal(
          userInitialTokenBal,
          "User  token wallet empty"
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
        stakingRoot = await locklift.factory.getDeployedContract(
          "StakingV1_2",
          addr.output?.value0!
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
          .call()
          .then((t) => t.value0);
        const root_address = await stakingWallet.methods
          .root({ answerId: 0 })
          .call()
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
        const UserData = await locklift.factory.getContractArtifacts(
          "UserData"
        );
        const Election = await locklift.factory.getContractArtifacts(
          "Election"
        );
        const RelayRound = await locklift.factory.getContractArtifacts(
          "RelayRound"
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

        if (locklift.context.network.name === "dev") {
          await sleep(DEV_WAIT);
        }

        const active = await stakingRoot.methods
          .isActive({ answerId: 0 })
          .call()
          .then((t) => t.value0);
        expect(active).to.be.equal(true, "Staking not active");
      });
    });
  });

  describe("Testing staking upgrade", async function () {
    it("Calling upgrade from V1 to V1_1", async function () {
      const new_code = await locklift.factory.getContractArtifacts(
        "StakingV1_1"
      );
      await stakingRoot.methods
        .upgrade({
          code: new_code.code,
          send_gas_to: stakingOwner.address,
        })
        .send({
          from: stakingOwner.address,
          amount: locklift.utils.toNano(11),
        });

      let new_staking = locklift.factory.getDeployedContract(
        "StakingV1_1",
        stakingRoot.address
      );

      const events = await new_staking
        .getPastEvents({ filter: "StakingUpdated" })
        .then((e) => e.events);
      const [
        {
          data: {},
        },
      ] = events;
    });

    it("Calling upgrade from V1_1 to V1_2", async function () {
      const new_code = await locklift.factory.getContractArtifacts(
        "StakingV1_2"
      );
      await stakingRoot.methods
        .upgrade({
          code: new_code.code,
          send_gas_to: stakingOwner.address,
        })
        .send({
          from: stakingOwner.address,
          amount: locklift.utils.toNano(11),
        });

      let new_staking = locklift.factory.getDeployedContract(
        "StakingV1_1",
        stakingRoot.address
      );

      const events = await new_staking
        .getPastEvents({ filter: "StakingUpdated" })
        .then((e) => e.events);
      const [
        {
          data: {},
        },
      ] = events;
    });

    it("Test storage", async function () {
      const res = await stakingRoot.methods
        .getDetails({ answerId: 0 })
        .call()
        .then((v) => v.value0);
      console.log(res);
    });
  });
});
