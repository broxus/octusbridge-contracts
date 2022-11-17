export {};

import { FactorySource } from "../../build/factorySource";
import { Address, Contract } from "locklift";
import { Account } from "everscale-standalone-client/nodejs";
const BigNumber = require("bignumber.js");
const {
  deployAccount,
  deployTokenWallets,
  deployTokenRoot,
  depositTokens,
  logger,
  mintTokens,
  stringToBytesArray,
  sleep,
} = require("../utils");

import { expect } from "chai";

const ProposalState = [
  "Pending",
  "Active",
  "Canceled",
  "Failed",
  "Succeeded",
  "Expired",
  "Queued",
  "Executed",
];

const proposalConfiguration = {
  votingDelay: 0,
  votingPeriod: 20,
  quorumVotes: 1000,
  timeLock: 0,
  threshold: 500,
  gracePeriod: 60 * 60 * 24 * 14,
};

const description = "proposal-test-1";
const bridge =
  "0:9cc3d8668d57d387eae54c4398a1a0b478b6a8c3a0f2b5265e641a212b435231";

const CALL_VALUE = locklift.utils.toNano(51);

let stakingRoot: Contract<FactorySource["StakingV1_2"]>;
let stakingOwner: Account;
let stakingToken: Contract<FactorySource["TokenRoot"]>;
let daoRoot: Contract<FactorySource["DaoRoot"]>;

describe("Test DAO in Staking", async function () {
  this.timeout(1000000);

  const deployEventConfiguration = async function (
    _owner: Address,
    _dao: Address
  ) {
    const signer = (await locklift.keystore.getSigner("0"))!;

    const DaoEthereumActionEvent = await locklift.factory.getContractArtifacts(
      "DaoEthereumActionEvent"
    );

    const { contract: eventConfig } = await locklift.factory.deployContract({
      contract: "EverscaleEthereumEventConfiguration",
      constructorParams: { _owner, _meta: "" },
      initParams: {
        basicConfiguration: {
          eventABI: "",
          eventInitialBalance: locklift.utils.toNano(2),
          staking: new Address(bridge),
          eventCode: DaoEthereumActionEvent.code,
        },
        networkConfiguration: {
          eventEmitter: _dao,
          proxy: 0,
          startTimestamp: 0,
          endTimestamp: 0,
        },
      },
      publicKey: signer.publicKey,
      value: locklift.utils.toNano(1),
    });

    return eventConfig;
  };

  before("Setup staking", async function () {
    const signer = (await locklift.keystore.getSigner("0"))!;

    logger.log(`Deploying stakingOwner`);
    stakingOwner = await deployAccount(signer, 500);
    logger.log(`Deploying stakingToken`);
    stakingToken = await deployTokenRoot("Staking", "ST", stakingOwner);
    logger.log(`Deploying DaoRoot`);

    const Platform = await locklift.factory.getContractArtifacts("Platform");
    const Proposal = await locklift.factory.getContractArtifacts("Proposal");

    logger.log(
      `Configuration: ${JSON.stringify(proposalConfiguration, null, 4)}`
    );
    const { contract: daoRoot_ } = await locklift.factory.deployContract({
      contract: "DaoRoot",
      constructorParams: {
        platformCode_: Platform.code,
        proposalConfiguration_: proposalConfiguration,
        admin_: stakingOwner.address,
      },
      initParams: {
        _nonce: locklift.utils.getRandomNonce(),
      },
      publicKey: signer.publicKey,
      value: locklift.utils.toNano(10),
    });
    logger.log(`DaoRoot address: ${daoRoot_.address}`);
    daoRoot = daoRoot_;
    logger.log(`Installing Proposal code`);
    await locklift.transactions.waitFinalized(
      daoRoot.methods
        .updateProposalCode({
          code: Proposal.code,
        })
        .send({
          from: stakingOwner.address,
          amount: locklift.utils.toNano(2),
        })
    );

    logger.log(`Deploy DAO ethereum action event configuration`);
    const eventConfiguration = await deployEventConfiguration(
      stakingOwner.address,
      daoRoot.address
    );

    logger.log(`Installing EthereumActionEventConfiguration address`);
    logger.log(eventConfiguration.address);

    await locklift.transactions.waitFinalized(
      daoRoot.methods
        .updateEthereumActionEventConfiguration({
          newConfiguration: eventConfiguration.address,
          newDeployEventValue: locklift.utils.toNano(2),
        })
        .send({
          from: stakingOwner.address,
          amount: locklift.utils.toNano(2),
        })
    );

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
        value: locklift.utils.toNano(55),
      });

    const UserData = await locklift.factory.getContractArtifacts("UserData");
    const Election = await locklift.factory.getContractArtifacts("Election");
    const RelayRound = await locklift.factory.getContractArtifacts(
      "RelayRound"
    );

    logger.log(`Deploying stakingRoot`);

    let { output: address } = await stakingRootDeployer.methods
      .deploy({
        _admin: stakingOwner.address,
        _tokenRoot: stakingToken.address,
        _dao_root: daoRoot.address,
        _rewarder: stakingOwner.address,
        _rescuer: stakingOwner.address,
        _bridge_event_config_eth_ton: new Address(bridge),
        _bridge_event_config_ton_eth: new Address(bridge),
        _bridge_event_config_ton_sol: new Address(bridge),
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
    logger.log(`Installing StakingRoot address for DaoRoot`);

    await locklift.transactions.waitFinalized(
      daoRoot.methods
        .setStakingRoot({
          newStakingRoot: stakingRoot.address,
        })
        .send({
          from: stakingOwner.address,
          amount: CALL_VALUE,
        })
    );

    logger.log(`Installing Platform code`);
    await locklift.transactions.waitFinalized(
      stakingRoot.methods
        .installPlatformOnce({
          code: Platform.code,
          send_gas_to: stakingOwner.address,
        })
        .send({
          from: stakingOwner.address,
          amount: CALL_VALUE,
        })
    );
    logger.log(`Installing UserData code`);
    await locklift.transactions.waitFinalized(
      stakingRoot.methods
        .installOrUpdateUserDataCode({
          code: UserData.code,
          send_gas_to: stakingOwner.address,
        })
        .send({
          from: stakingOwner.address,
          amount: CALL_VALUE,
        })
    );
    logger.log(`Installing ElectionCode code`);
    await locklift.transactions.waitFinalized(
      stakingRoot.methods
        .installOrUpdateElectionCode({
          code: Election.code,
          send_gas_to: stakingOwner.address,
        })
        .send({
          from: stakingOwner.address,
          amount: CALL_VALUE,
        })
    );
    logger.log(`Installing RelayRoundCode code`);
    await locklift.transactions.waitFinalized(
      stakingRoot.methods
        .installOrUpdateRelayRoundCode({
          code: RelayRound.code,
          send_gas_to: stakingOwner.address,
        })
        .send({
          from: stakingOwner.address,
          amount: CALL_VALUE,
        })
    );
    logger.log(`Set staking is Active`);
    await locklift.transactions.waitFinalized(
      stakingRoot.methods
        .setActive({
          new_active: true,
          send_gas_to: stakingOwner.address,
        })
        .send({
          from: stakingOwner.address,
          amount: CALL_VALUE,
        })
    );
  });
  describe("DAO", async function () {
    const getUserDataAccount = async function (_user: Account) {
      const userData = await locklift.factory.getDeployedContract(
        "UserData",
        await stakingRoot.methods
          .getUserDataAddress({ user: _user.address, answerId: 0 })
          .call()
          .then((t) => t.value0)
      );
      return userData;
    };
    const DEPOSIT_VALUE = 100000;
    let userAccount0: Account;
    let userTokenWallet0: Contract<FactorySource["TokenWallet"]>;
    let userDataContract0: Contract<FactorySource["UserData"]>;
    let userAccount1: Account;
    let userTokenWallet1: Contract<FactorySource["TokenWallet"]>;
    let userDataContract1: Contract<FactorySource["UserData"]>;
    let proposalId: string;
    let testTarget: Contract<FactorySource["TestTarget"]>;
    before("Setup test accounts", async function () {
      const signer0 = (await locklift.keystore.getSigner("0"))!;
      const signer1 = (await locklift.keystore.getSigner("1"))!;
      const signer2 = (await locklift.keystore.getSigner("2"))!;

      userAccount0 = await deployAccount(signer1, 100);
      userAccount1 = await deployAccount(signer2, 100);
      logger.log(`UserAccount0: ${userAccount0.address}`);
      logger.log(`UserAccount1: ${userAccount1.address}`);

      logger.log(`Deploy Token Wallets`);
      [userTokenWallet0, userTokenWallet1] = await deployTokenWallets(
        [userAccount0, userAccount1],
        stakingToken
      );
      logger.log(`Mint tokens`);
      await mintTokens(
        stakingOwner,
        [userAccount0, userAccount1],
        stakingToken,
        DEPOSIT_VALUE * 2
      );

      logger.log(`Depositing test tokens 0 `);
      await depositTokens(
        stakingRoot,
        userAccount0,
        userTokenWallet0,
        DEPOSIT_VALUE * 2
      );
      logger.log(`Depositing test tokens 1 `);
      await depositTokens(
        stakingRoot,
        userAccount1,
        userTokenWallet1,
        DEPOSIT_VALUE
      );

      userDataContract0 = await getUserDataAccount(userAccount0);
      userDataContract1 = await getUserDataAccount(userAccount1);
      logger.log(`UserDataContract0: ${userDataContract0.address}`);
      logger.log(`UserDataContract1: ${userDataContract1.address}`);

      const { contract: testTarget_ } = await locklift.factory.deployContract({
        contract: "TestTarget",
        constructorParams: {
          _daoRoot: daoRoot.address,
        },
        initParams: {
          _nonce: locklift.utils.getRandomNonce(),
        },
        publicKey: signer0.publicKey,
        value: locklift.utils.toNano(0.2),
      });

      logger.log(`TestTarget: ${testTarget_.address}`);
      testTarget = testTarget_;
    });
    describe("Proposal tests", async function () {
      let proposal: Contract<FactorySource["Proposal"]>;
      let newParam = 16711680;
      let tonActions: any[] = [];

      let ethActions = [
        {
          value: 1,
          chainId: 2,
          target: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
          signature: stringToBytesArray("test(uint8 a)"),
          callData:
            "000000000000000000000000000000000000000000000000000000000000000f",
        },
      ];
      before("Deploy proposal", async function () {
        let callHash = await testTarget.methods
          .getCallHash({ newParam })
          .call()
          .then((t) => t.value0);
        tonActions = [
          {
            value: locklift.utils.toNano(1),
            target: testTarget.address,
            payload: await testTarget.methods
              .encodePayload({ addr: testTarget.address, callHash })
              .call()
              .then((t) => t.value0),
          },
        ];

        await locklift.transactions.waitFinalized(
          daoRoot.methods
            .propose({
              answerId: 0,
              tonActions,
              ethActions,
              description,
            })
            .send({
              from: userAccount0.address,
              amount: locklift.utils.toNano(10 + 0.5 + 0.5 + 1 + 2 + 0.1),
            })
        );
        const deployedProposals = await userDataContract0.methods
          .created_proposals()
          .call()
          .then((t) => t.created_proposals);

        proposalId = deployedProposals[0][0];
        const expectedProposalAddress = await daoRoot.methods
          .expectedProposalAddress({ proposalId: proposalId, answerId: 0 })
          .call()
          .then((t) => t.value0);
        proposal = await locklift.factory.getDeployedContract(
          "Proposal",
          expectedProposalAddress
        );
        logger.log(
          `Deployed Proposal #${proposalId}: ${expectedProposalAddress}`
        );
        logger.log(`TonActions: \n${JSON.stringify(tonActions, null, 4)}`);
        logger.log(`EthActions: \n${JSON.stringify(ethActions, null, 4)}`);
      });
      it("Check is staking is Active", async function () {
        expect(
          await stakingRoot.methods
            .isActive({ answerId: 0 })
            .call()
            .then((t) => t.value0)
        ).to.be.equal(true, "staking is not Active");
      });
      it("Check balance", async function () {
        expect(
          await userDataContract0.methods
            .getDetails({ answerId: 0 })
            .call()
            .then((v) => v.value0.token_balance.toString())
        ).to.be.equal(
          (DEPOSIT_VALUE * 2).toString(),
          "userDataContract0 wrong token_balance"
        );
        expect(
          await userDataContract1.methods
            .getDetails({ answerId: 0 })
            .call()
            .then((v) => v.value0.token_balance.toString())
        ).to.be.equal(
          DEPOSIT_VALUE.toString(),
          "userDataContract1 wrong token_balance"
        );
      });
      describe("Check proposal deployed correct", async function () {
        it("Check proposer", async function () {
          const proposer = await proposal.methods.proposer().call();
          expect(proposer.proposer.toString()).to.equal(
            userAccount0.address.toString(),
            "Wrong proposal proposer"
          );
        });
        it("Check locked tokens", async function () {
          const proposalId = await proposal.methods.id().call();
          const expectedThreshold = proposalConfiguration.threshold.toString();
          logger.log(`Expected threshold: ${expectedThreshold.toString()}`);
          const createdProposalLockedVotes = await userDataContract0.methods
            .created_proposals()
            .call()
            .then(
              (t) =>
                t.created_proposals
                  .filter(([key, _]) => key == proposalId.id)
                  .map(([key, value]) => value)[0]
            );

          logger.log(
            `Current locked votes for proposal creation: ${createdProposalLockedVotes}`
          );
          const lockedVotes = await userDataContract0.methods
            .lockedTokens({ answerId: 0 })
            .call()
            .then((t) => parseInt(t.value0, 10));
          const totalVotes = await userDataContract0.methods
            .getDetails({ answerId: 0 })
            .call()
            .then((v) => parseInt(v.value0.token_balance, 10));
          logger.log(`userDataContract0 totalVotes: ${totalVotes.toString()}`);
          logger.log(
            `userDataContract0 availableVotes: ${(
              totalVotes - lockedVotes
            ).toString()}`
          );
          expect(createdProposalLockedVotes.toString()).to.equal(
            expectedThreshold.toString(),
            "Wrong threshold"
          );
          expect(lockedVotes.toString()).to.equal(
            expectedThreshold.toString(),
            "Wrong lockedVotes"
          );
        });
        it("Check TonActions", async function () {
          const actualTonActions = await proposal.methods
            .tonActions()
            .call()
            .then((t) => t.tonActions);

          expect(actualTonActions.length).to.equal(
            tonActions.length,
            "Wrong TonActions amount"
          );
          for (const [i, actualTonAction] of actualTonActions.entries()) {
            expect(actualTonAction.value).to.equal(
              tonActions[i].value,
              "Wrong TonAction value"
            );
            expect(actualTonAction.target.toString()).to.equal(
              tonActions[i].target.toString(),
              "Wrong TonAction target"
            );
            expect(actualTonAction.payload.toString()).to.equal(
              tonActions[i].payload.toString(),
              "Wrong TonAction payload"
            );
          }
        });
        it("Check EthActions", async function () {
          const actualEthActions = await proposal.methods
            .ethActions()
            .call()
            .then((t) => t.ethActions);
          expect(actualEthActions.length).to.equal(
            ethActions.length,
            "Wrong EthActions amount"
          );
          for (const [i, actualEthAction] of actualEthActions.entries()) {
            expect(new BigNumber(actualEthAction.value).toString()).to.equal(
              ethActions[i].value.toString(),
              "Wrong EthActions value"
            );
            expect(
              "0x" + new BigNumber(actualEthAction.target).toString(16)
            ).to.equal(ethActions[i].target, "Wrong EthActions target");
            expect(actualEthAction.chainId.toString()).to.equal(
              ethActions[i].chainId.toString(),
              "Wrong EthActions chainId"
            );
            expect(actualEthAction.signature).to.equal(
              ethActions[i].signature,
              "Wrong EthActions signature"
            );
            expect(actualEthAction.callData).to.equal(
              ethActions[i].callData,
              "Wrong EthActions callData"
            );
          }
        });
        it("Check State", async function () {
          const state = await proposal.methods
            .getState({ answerId: 0 })
            .call()
            .then((t) => parseInt(t.value0, 10));
          logger.log(`Actual state: ${ProposalState[state]}`);
          expect(["Active", "Pending"]).to.include(
            ProposalState[state],
            "Wrong State"
          );
        });
      });
      describe("Check votes [support=True]", async function () {
        let votesToCast: string;
        let forVotesBefore: string;
        let againstVotesBefore: string;
        let castedVoteBefore: boolean;
        before("Make vote support Vote", async function () {
          await sleep(1000);
          castedVoteBefore = await userDataContract0.methods
            .casted_votes()
            .call()
            .then(
              (t) =>
                t.casted_votes
                  .filter(([key, _]) => key == proposalId)
                  .map(([key, value]) => value)[0]
            );
          votesToCast = await userDataContract0.methods
            .getDetails({ answerId: 0 })
            .call()
            .then((v) => v.value0.token_balance);
          forVotesBefore = await proposal.methods
            .forVotes({})
            .call()
            .then((t) => t.forVotes);
          againstVotesBefore = await proposal.methods
            .againstVotes({})
            .call()
            .then((t) => t.againstVotes);
          logger.log(
            `Account0 Cast Vote for Proposal ${proposalId}, amount: ${votesToCast.toString()}, support: True`
          );
          logger.log(`DaoAccount0 casted vote Before: ${castedVoteBefore}`);

          await locklift.transactions.waitFinalized(
            stakingRoot.methods
              .castVote({
                proposal_id: proposalId,
                support: true,
              })
              .send({
                from: userAccount0.address,
                amount: CALL_VALUE,
              })
          );
        });
        it("Check votes after", async function () {
          const forVotes = await proposal.methods
            .forVotes({})
            .call()
            .then((t) => t.forVotes);
          const againstVotes = await proposal.methods
            .againstVotes({})
            .call()
            .then((t) => t.againstVotes);
          const castedVote = await userDataContract0.methods
            .casted_votes()
            .call()
            .then(
              (t) =>
                t.casted_votes
                  .filter(([key, _]) => key == proposalId)
                  .map(([key, value]) => value)[0]
            );
          logger.log(`Proposal ForVotes: ${forVotes.toString()}`);
          logger.log(`Proposal againstVotes: ${againstVotes.toString()}`);
          logger.log(`DaoAccount0 castedVote: ${castedVote}`);
          expect(
            (
              parseInt(forVotesBefore, 10) + parseInt(votesToCast, 10)
            ).toString()
          ).to.equal(forVotes, "Wrong forVotes");
          expect(againstVotes).to.equal(
            againstVotesBefore,
            "Wrong againstVotes"
          );
          expect(castedVoteBefore).to.equal(
            undefined,
            "Wrong castedVote Before"
          );
          expect(castedVote).to.equal(true, "Wrong castedVote");
        });
      });
      describe("Check votes [support=False]", async function () {
        let votesToCast: string;
        let forVotesBefore: string;
        let againstVotesBefore: string;
        let castedVotesBefore: boolean;
        before("Make vote support Vote", async function () {
          castedVotesBefore = await userDataContract1.methods
            .casted_votes()
            .call()
            .then(
              (t) =>
                t.casted_votes
                  .filter(([key, _]) => key == proposalId)
                  .map(([key, value]) => value)[0]
            );

          votesToCast = await userDataContract1.methods
            .getDetails({ answerId: 0 })
            .call()
            .then((v) => v.value0.token_balance);
          forVotesBefore = await proposal.methods
            .forVotes({})
            .call()
            .then((t) => t.forVotes);
          againstVotesBefore = await proposal.methods
            .againstVotes({})
            .call()
            .then((t) => t.againstVotes);
          logger.log(
            `Account1 Cast Vote for Proposal ${proposalId}, amount: ${votesToCast.toString()}, support: False`
          );
          logger.log(`DaoAccount1 castedVotes Before: ${castedVotesBefore}`);

          await locklift.transactions.waitFinalized(
            stakingRoot.methods
              .castVote({
                proposal_id: proposalId,
                support: false,
              })
              .send({
                from: userAccount1.address,
                amount: CALL_VALUE,
              })
          );
        });
        it("Check votes after", async function () {
          const forVotes = await proposal.methods
            .forVotes({})
            .call()
            .then((t) => t.forVotes);
          const againstVotes = await proposal.methods
            .againstVotes({})
            .call()
            .then((t) => t.againstVotes);
          const castedVote = await userDataContract1.methods
            .casted_votes()
            .call()
            .then(
              (t) =>
                t.casted_votes
                  .filter(([key, _]) => key == proposalId)
                  .map(([key, value]) => value)[0]
            );
          logger.log(`Proposal ForVotes: ${forVotes.toString()}`);
          logger.log(`Proposal againstVotes: ${againstVotes.toString()}`);
          logger.log(`DaoAccount1 castedVote: ${castedVote}`);
          expect(
            (
              parseInt(againstVotesBefore, 10) + parseInt(votesToCast, 10)
            ).toString()
          ).to.equal(againstVotes, "Wrong againstVotes");
          expect(forVotes).to.equal(forVotesBefore, "Wrong forVotes");
          expect(castedVotesBefore).to.equal(
            undefined,
            "Wrong castedVotes Before"
          );
          expect(castedVote).to.equal(false, "Wrong castedVote");
        });
      });
      describe("Check proposal execution", async function () {
        let timeLeft;
        before("Make vote support Vote", async function () {
          const voteEndTime = await proposal.methods.endTime({}).call();
          timeLeft =
            parseInt(voteEndTime.endTime, 10) - Math.floor(Date.now() / 1000);
          logger.log(`Time left to vote end: ${timeLeft}`);
          // await sleep((timeLeft + 5) * 1000);
          await locklift.testing.increaseTime(timeLeft + 5);
        });
        it("Check status after vote end", async function () {
          let state = await proposal.methods.getState({ answerId: 0 }).call();
          logger.log(
            `Current state: ${ProposalState[parseInt(state.value0, 10)]}`
          );
          expect(ProposalState[parseInt(state.value0, 10)]).to.equal(
            "Succeeded",
            "Wrong state"
          );
        });
        it("Check proposal Queue", async function () {
          logger.log("Queue proposal");
          const signer0 = (await locklift.keystore.getSigner("0"))!;
          await locklift.transactions.waitFinalized(
            proposal.methods.queue().sendExternal({
              publicKey: signer0.publicKey,
              withoutSignature: true,
            })
          );

          let state = await proposal.methods.getState({ answerId: 0 }).call();
          logger.log(
            `Current state: ${ProposalState[parseInt(state.value0, 10)]}`
          );
          expect(ProposalState[parseInt(state.value0, 10)]).to.equal(
            "Queued",
            "Wrong state"
          );
        });
        it("Check proposal Executing", async function () {
          const targetExecutedBefore = await testTarget.methods
            .executed({})
            .call();

          expect(targetExecutedBefore.executed).to.equal(
            false,
            "Wrong executed state in target before executing"
          );

          logger.log("Executing proposal");

          const signer0 = (await locklift.keystore.getSigner("0"))!;
          await proposal.methods.execute().sendExternal({
            publicKey: signer0.publicKey,
            withoutSignature: true,
          });
          let state = await proposal.methods.getState({ answerId: 0 }).call();
          logger.log(
            `Current state: ${ProposalState[parseInt(state.value0, 10)]}`
          );
          expect(ProposalState[parseInt(state.value0, 10)]).to.equal(
            "Executed",
            "Wrong state"
          );

          await locklift.transactions.waitFinalized(
            testTarget.methods
              .call({
                newParam,
              })
              .send({
                from: userAccount1.address,
                amount: locklift.utils.toNano(1),
              })
          );

          await locklift.transactions.waitFinalized(
            testTarget.methods
              .call({
                newParam: 0,
              })
              .send({
                from: userAccount1.address,
                amount: locklift.utils.toNano(1),
              })
          );

          const targetExecuted = await testTarget.methods.executed().call();
          const targetParam = await testTarget.methods.param().call();
          expect(targetExecuted.executed).to.equal(
            true,
            "Wrong executed state in target after executing"
          );
          expect(targetParam.param).to.equal(
            newParam.toString(),
            "Wrong target new param after executing"
          );
        });
      });
      describe("Check unlock proposer vote tokens", async function () {
        it("Check votes amount after unlock", async function () {
          const lockedVotes = await userDataContract0.methods
            .lockedTokens({ answerId: 0 })
            .call();
          const totalVotes = await userDataContract0.methods
            .getDetails({ answerId: 0 })
            .call()
            .then((v) => v.value0.token_balance);
          logger.log(`DaoAccount0 lockedVotes: ${lockedVotes.value0.toString()}`);
          logger.log(`DaoAccount0 totalVotes: ${totalVotes.toString()}`);
          expect(parseInt(lockedVotes.value0, 10)).to.equal(
            0,
            "Wrong locked votes"
          );
        });
      });
      describe("Check unlock casted votes", async function () {
        let castedVotesBefore: string[];
        let canWithdrawBefore: boolean;
        before("Unlock casted votes", async function () {
          castedVotesBefore = await userDataContract0.methods
            .casted_votes()
            .call()
            .then((t) =>
              t.casted_votes
                .filter(([key, _]) => key == proposalId)
                .map(([key, value]) => key)
            );

          logger.log(
            `Casted votes before unlock: ${JSON.stringify(castedVotesBefore)}`
          );
          canWithdrawBefore = await userDataContract0.methods
            .canWithdrawVotes({ answerId: 0 })
            .call()
            .then((t) => t.value0);
          logger.log(`Casted withdraw before unlock: ${canWithdrawBefore}`);
          await locklift.transactions.waitFinalized(
            stakingRoot.methods
              .tryUnlockCastedVotes({ proposal_ids: castedVotesBefore })
              .send({
                from: userAccount0.address,
                amount: CALL_VALUE,
              })
          );
        });
        it("Check casted votes before unlock", async function () {
          expect(canWithdrawBefore).to.equal(
            false,
            "Wrong canWithdrawVotes before"
          );
        });
        it("Check casted votes after unlock", async function () {
          const castedVotes = Object.keys(
            await userDataContract0.methods
              .casted_votes()
              .call()
              .then((t) => t.casted_votes)
          );
          logger.log(
            `Casted votes after unlock: ${JSON.stringify(castedVotes)}`
          );
          const canWithdraw = await userDataContract0.methods
            .canWithdrawVotes({ answerId: 0 })
            .call()
            .then((t) => t.value0);
          logger.log(`Casted withdraw after unlock: ${canWithdraw}`);
          expect(canWithdraw).to.equal(true, "Wrong canWithdrawVotes after");
        });
      });
    });
    describe("Test configuration update", async function () {
      let newConfiguration = {
        votingDelay: 60 * 60 * 24 * 2,
        votingPeriod: 60 * 60 * 24 * 3,
        quorumVotes: 500000_000000000,
        timeLock: 60 * 60 * 24 * 2,
        threshold: 100000_000000000,
        gracePeriod: 60 * 60 * 24 * 2,
      };
      let currentConfiguration: any;
      before("Update proposals configuration", async function () {
        await locklift.transactions.waitFinalized(
          daoRoot.methods
            .updateProposalConfiguration({ newConfig: newConfiguration })
            .send({
              from: stakingOwner.address,
              amount: locklift.utils.toNano(2),
            })
        );
        currentConfiguration = await daoRoot.methods
          .proposalConfiguration()
          .call()
          .then((t) => t.proposalConfiguration);
      });
      it("Check new configuration", async function () {
        expect(currentConfiguration.votingDelay.toString()).to.equal(
          newConfiguration.votingDelay.toString(),
          "Wrong votingDelay"
        );
        expect(currentConfiguration.votingPeriod.toString()).to.equal(
          newConfiguration.votingPeriod.toString(),
          "Wrong votingPeriod"
        );
        expect(currentConfiguration.quorumVotes.toString()).to.equal(
          newConfiguration.quorumVotes.toString(),
          "Wrong quorumVotes"
        );
        expect(currentConfiguration.timeLock.toString()).to.equal(
          newConfiguration.timeLock.toString(),
          "Wrong timeLock"
        );
        expect(currentConfiguration.threshold.toString()).to.equal(
          newConfiguration.threshold.toString(),
          "Wrong threshold"
        );
        expect(currentConfiguration.gracePeriod.toString()).to.equal(
          newConfiguration.gracePeriod.toString(),
          "Wrong gracePeriod"
        );
      });
    });
    describe("Test DAO root upgrade", async function () {
      let newDaoRoot: Contract<FactorySource["TestUpgrade"]>;
      before("Run update function", async function () {
        const TestUpgrade = await locklift.factory.getContractArtifacts(
          "TestUpgrade"
        );
        await locklift.transactions.waitFinalized(
          daoRoot.methods.upgrade({ code: TestUpgrade.code }).send({
            from: stakingOwner.address,
            amount: locklift.utils.toNano(3),
          })
        );
        newDaoRoot = await locklift.factory.getDeployedContract(
          "TestUpgrade",
          daoRoot.address
        );
      });
      it("Check new DAO Root contract", async function () {
        expect(
          await newDaoRoot.methods
            .storedData()
            .call()
            .then((t) => t.storedData)
        ).to.not.equal(null, "Emtpy data after upgrade");
        expect(
          await newDaoRoot.methods
            .isUpgraded()
            .call()
            .then((t) => t.isUpgraded)
        ).to.equal(true, "Wrong votingPeriod");
      });
    });
  });
});
