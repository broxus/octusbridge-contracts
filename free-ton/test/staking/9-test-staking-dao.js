const {
  expect,
} = require('../utils');
const BigNumber = require('bignumber.js');
const logger = require('mocha-logger');

const EMPTY_TVM_CELL = 'te6ccgEBAQEAAgAAAA==';

const TOKEN_PATH = '../node_modules/ton-eth-bridge-token-contracts/free-ton/build';

const stringToBytesArray = (dataString) => {
  return Buffer.from(dataString).toString('hex')
};

const getRandomNonce = () => Math.random() * 64000 | 0;

const afterRun = async (tx) => {
  await new Promise(resolve => setTimeout(resolve, 2000));
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const ProposalState = [
  'Pending',
  'Active',
  'Canceled',
  'Failed',
  'Succeeded',
  'Expired',
  'Queued',
  'Executed'
]

const proposalConfiguration = {
  votingDelay: 0,
  votingPeriod: 20,
  quorumVotes: 1000,
  timeLock: 0,
  threshold: 500,
  gracePeriod: 60 * 60 * 24 * 14
}


const description = stringToBytesArray('proposal-test-1');

const bridge = '0:9cc3d8668d57d387eae54c4398a1a0b478b6a8c3a0f2b5265e641a212b435231'

let stakingRoot;
let stakingOwner;
let stakingToken;
let daoRoot;

describe('Test DAO in Staking', async function () {
  this.timeout(1000000);

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
  const deployTokenWallets = async function (root, user) {
    const tx = await root.run({
      method: 'deployWallet',
      params: {
        deploy_grams: locklift.utils.convertCrystal(1, 'nano'),
        wallet_public_key_: 0,
        owner_address_: user.address,
        gas_back_address: user.address,
        tokens: locklift.utils.convertCrystal(10, 'nano')
      },
    });
    return tx.decoded.output.value0;
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

  const depositTokens = async function (user, _userTokenWallet, depositAmount) {
    const DEPOSIT_PAYLOAD = 'te6ccgEBAQEAAwAAAgA=';

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
        payload: DEPOSIT_PAYLOAD
      },
      value: locklift.utils.convertCrystal(2.5, 'nano')
    });
  };
  const deployEventConfiguration = async function (_owner, _dao) {
    const [keyPair] = await locklift.keys.getKeyPairs();
    const DaoEthereumActionEventConfiguration = await locklift.factory.getContract('TonEventConfiguration');
    const DaoEthereumActionEvent = await locklift.factory.getContract('DaoEthereumActionEvent');

    return await locklift.giver.deployContract({
      contract: DaoEthereumActionEventConfiguration,
      constructorParams: {_owner, _meta: '',},
      initParams: {
        basicConfiguration: {
          eventABI: '',
          eventInitialBalance: locklift.utils.convertCrystal('2', 'nano'),
          staking: bridge,
          eventCode: DaoEthereumActionEvent.code,
        },
        networkConfiguration: {
          eventEmitter: _dao,
          proxy: 0,
          startTimestamp: 0,
          endTimestamp: 0,
        }
      },
      keyPair
    }, locklift.utils.convertCrystal('1.0', 'nano'));
  };

  before('Setup staking', async function () {
    const keyPairs = await locklift.keys.getKeyPairs();
    logger.log(`Deploying stakingOwner`);
    stakingOwner = await deployAccount(keyPairs[0], 10);
    logger.log(`Deploying stakingToken`);
    stakingToken = await deployTokenRoot('Staking', 'ST');

    const Platform = await locklift.factory.getContract('Platform');


    logger.log(`Deploying DaoRoot`);

    const DaoRoot = await locklift.factory.getContract('DaoRoot');
    const Proposal = await locklift.factory.getContract('Proposal');

    logger.log(`Configuration: ${JSON.stringify(proposalConfiguration, null, 4)}`);
    daoRoot = await locklift.giver.deployContract({
      contract: DaoRoot,
      constructorParams: {
        platformCode_: Platform.code,
        proposalConfiguration_: proposalConfiguration,
        admin_: stakingOwner.address
      },
      initParams: {
        _nonce: getRandomNonce(),
      },
      keyPair: keyPairs[0],
    }, locklift.utils.convertCrystal(10, 'nano'));
    logger.log(`DaoRoot address: ${daoRoot.address}`);
    logger.log(`Installing Proposal code`);
    await stakingOwner.runTarget({
      contract: daoRoot,
      method: 'updateProposalCode',
      params: {code: Proposal.code},
    });

    logger.log(`Deploy DAO ethereum action event configuration`);
    const eventConfiguration = await deployEventConfiguration(stakingOwner.address, daoRoot.address);

    logger.log(`Installing EthereumActionEventConfiguration address`);
    logger.log(eventConfiguration.address);
    await stakingOwner.runTarget({
      contract: daoRoot,
      method: 'updateEthereumActionEventConfiguration',
      params: {
        newConfiguration: eventConfiguration.address,
        newDeployEventValue: locklift.utils.convertCrystal(2, 'nano')
      },
    });
    const StakingRootDeployer = await locklift.factory.getContract('StakingRootDeployer');
    const stakingRootDeployer = await locklift.giver.deployContract({
      contract: StakingRootDeployer,
      constructorParams: {},
      initParams: {
        nonce: getRandomNonce()
      },
      keyPair: keyPairs[0]
    }, locklift.utils.convertCrystal(10, 'nano'));
    const UserData = await locklift.factory.getContract('UserData');
    const Election = await locklift.factory.getContract('Election');
    const RelayRound = await locklift.factory.getContract('RelayRound');


    logger.log(`Deploying stakingRoot`);
    stakingRoot = await locklift.factory.getContract('Staking');
    stakingRoot.setAddress((await stakingRootDeployer.run({
      method: 'deploy',
      params: {
        stakingCode: stakingRoot.code,
        _admin: stakingOwner.address,
        _tokenRoot: stakingToken.address,
        _dao_root: daoRoot.address,
        _rewarder: stakingOwner.address,
        _bridge_event_config: bridge,
        _bridge_event_proxy: bridge,
        _deploy_nonce: getRandomNonce()
      }
    })).decoded.output.value0)
    logger.log(`StakingRoot address: ${stakingRoot.address}`);
    logger.log(`StakingRoot owner address: ${stakingOwner.address}`);
    logger.log(`StakingRoot token root address: ${stakingToken.address}`);
    logger.log(`Installing StakingRoot address for DaoRoot`);
    await stakingOwner.runTarget({
      contract: daoRoot,
      method: 'setStakingRoot',
      params: {newStakingRoot: stakingRoot.address},
    });
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
    logger.log(`Set staking is Active`);
    await stakingOwner.runTarget({
      contract: stakingRoot,
      method: 'setActive',
      params: {new_active: true, send_gas_to: stakingOwner.address},
    });
  })
  describe('DAO', async function () {
    const getUserDataAccount = async function (_user) {
      const userData = await locklift.factory.getContract('UserData');
      userData.setAddress(await stakingRoot.call({
        method: 'getUserDataAddress',
        params: {user: _user.address}
      }));
      return userData
    }
    const DEPOSIT_VALUE = 100000;
    let userAccount0;
    let userTokenWallet0;
    let userDataContract0;
    let userAccount1;
    let userTokenWallet1;
    let userDataContract1;
    let proposalId;
    let testTarget;
    before('Setup test accounts', async function () {
      const keyPairs = await locklift.keys.getKeyPairs();

      userAccount0 = await deployAccount(keyPairs[1], 50);
      userAccount1 = await deployAccount(keyPairs[2], 10);
      logger.log(`UserAccount0: ${userAccount0.address}`);
      logger.log(`UserAccount1: ${userAccount1.address}`);


      userTokenWallet0 = await locklift.factory.getContract('TONTokenWallet', TOKEN_PATH);
      userTokenWallet0.setAddress(await deployTokenWallets(stakingToken, userAccount0));

      userTokenWallet1 = await locklift.factory.getContract('TONTokenWallet', TOKEN_PATH);
      userTokenWallet1.setAddress(await deployTokenWallets(stakingToken, userAccount1));

      logger.log(`Depositing test tokens`);
      await depositTokens(userAccount0, userTokenWallet0, DEPOSIT_VALUE * 2);
      await depositTokens(userAccount1, userTokenWallet1, DEPOSIT_VALUE);

      userDataContract0 = await getUserDataAccount(userAccount0);
      userDataContract1 = await getUserDataAccount(userAccount1);
      logger.log(`UserDataContract0: ${userDataContract0.address}`);
      logger.log(`UserDataContract1: ${userDataContract1.address}`);

      const TestTarget = await locklift.factory.getContract('TestTarget');
      testTarget = await locklift.giver.deployContract({
        contract: TestTarget,
        constructorParams: {
          _daoRoot: daoRoot.address,
        },
        initParams: {
          _nonce: getRandomNonce(),
        },
        keyPair: keyPairs[0],
      }, locklift.utils.convertCrystal(0.2, 'nano'));
      logger.log(`TestTarget: ${testTarget.address}`);

    })
    describe('Proposal tests', async function () {
      let proposal;
      let newParam = 16711680;
      let tonActions = [];

      let ethActions = [
        {
          value: 1,
          chainId: 2,
          target: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
          signature: stringToBytesArray('test(uint8 a)'),
          callData: '000000000000000000000000000000000000000000000000000000000000000f'
        }
      ];
      before('Deploy proposal', async function () {
        let callHash = '0x' + (await testTarget.call({method: 'getCallHash', params: {newParam}})).toString(16);
        tonActions = [{
          value: locklift.utils.convertCrystal(1, 'nano'),
          target: testTarget.address,
          payload: await testTarget.call({method: 'encodePayload', params: {addr: testTarget.address, callHash}})
        }];
        await userAccount0.runTarget({
          contract: daoRoot,
          method: 'propose',
          params: {
            answerId: 0,
            tonActions,
            ethActions,
            description
          },
          value: locklift.utils.convertCrystal(10 + 0.5 + 0.5 + 1 + 2 + 0.1, 'nano'),
        });
        const deployedProposals = await userDataContract0.call({method: 'created_proposals'});
        proposalId = Object.keys(deployedProposals)[0];
        const expectedProposalAddress = await daoRoot.call({
          method: 'expectedProposalAddress',
          params: {proposalId: proposalId}
        });
        proposal = await locklift.factory.getContract('Proposal');
        proposal.setAddress(expectedProposalAddress);
        proposal.afterRun = afterRun;
        logger.log(`Deployed Proposal #${proposalId}: ${expectedProposalAddress}`);
        logger.log(`TonActions: \n${JSON.stringify(tonActions, null, 4)}`);
        logger.log(`EthActions: \n${JSON.stringify(ethActions, null, 4)}`);
      })
      it('Check is staking is Active', async function () {
        expect(await stakingRoot.call({method: 'isActive'}))
          .to.be.equal(true, 'taking is not Active');
      })
      it('Check balance', async function () {
        expect((await userDataContract0.call({method: 'getDetails'})).token_balance.toString())
          .to.be.equal((DEPOSIT_VALUE * 2).toString(), 'userDataContract0 wrong token_balance');
        expect((await userDataContract1.call({method: 'getDetails'})).token_balance.toString())
          .to.be.equal(DEPOSIT_VALUE.toString(), 'userDataContract1 wrong token_balance');
      });
      describe('Check proposal deployed correct', async function () {
        it('Check proposer', async function () {
          const proposer = await proposal.call({method: 'proposer'});
          expect(proposer)
            .to
            .equal(userAccount0.address, 'Wrong proposal proposer');
        });
        it('Check locked tokens', async function () {
          const proposalId = await proposal.call({method: 'id'});
          const expectedThreshold = proposalConfiguration.threshold.toString();
          logger.log(`Expected threshold: ${expectedThreshold.toString()}`);
          const createdProposalLockedVotes = (await userDataContract0.call({method: 'created_proposals'}))[proposalId];
          logger.log(`Current locked votes for proposal creation: ${createdProposalLockedVotes}`);
          const lockedVotes = await userDataContract0.call({method: 'lockedTokens'});
          const totalVotes = (await userDataContract0.call({method: 'getDetails'})).token_balance;
          logger.log(`userDataContract0 totalVotes: ${totalVotes.toString()}`);
          logger.log(`userDataContract0 availableVotes: ${totalVotes.minus(lockedVotes).toString()}`);
          expect(createdProposalLockedVotes.toString())
            .to
            .equal(expectedThreshold.toString(), 'Wrong threshold');
          expect(lockedVotes.toString())
            .to
            .equal(expectedThreshold.toString(), 'Wrong lockedVotes');
        });
        it('Check TonActions', async function () {
          const actualTonActions = await proposal.call({method: 'tonActions'});
          expect(actualTonActions.length)
            .to
            .equal(tonActions.length, 'Wrong TonActions amount');
          for (const [i, actualTonAction] of actualTonActions.entries()) {
            expect(actualTonAction.value)
              .to
              .equal(tonActions[i].value, 'Wrong TonAction value');
            expect(actualTonAction.target)
              .to
              .equal(tonActions[i].target, 'Wrong TonAction target');
            expect(actualTonAction.payload)
              .to
              .equal(tonActions[i].payload, 'Wrong TonAction payload');
          }
        });
        it('Check EthActions', async function () {
          const actualEthActions = await proposal.call({method: 'ethActions'});
          expect(actualEthActions.length)
            .to
            .equal(ethActions.length, 'Wrong EthActions amount');
          for (const [i, actualEthAction] of actualEthActions.entries()) {
            expect(new BigNumber(actualEthAction.value).toString())
              .to
              .equal(ethActions[i].value.toString(), 'Wrong EthActions value');
            expect('0x' + new BigNumber(actualEthAction.target).toString(16))
              .to
              .equal(ethActions[i].target, 'Wrong EthActions target');
           expect(actualEthAction.chainId.toString())
              .to
              .equal(ethActions[i].chainId.toString(), 'Wrong EthActions chainId');
            expect(actualEthAction.signature)
              .to
              .equal(ethActions[i].signature, 'Wrong EthActions signature');
            expect(actualEthAction.callData)
              .to
              .equal(ethActions[i].callData, 'Wrong EthActions callData');
          }
        });
        it('Check State', async function () {
          const state = await proposal.call({method: 'getState'});
          logger.log(`Actual state: ${ProposalState[state]}`);
          expect(['Active', 'Pending'])
            .to
            .include(ProposalState[state], 'Wrong State');
        })
      })
      describe('Check votes [support=True]', async function () {
        let votesToCast;
        let forVotesBefore;
        let againstVotesBefore;
        let castedVoteBefore;
        before('Make vote support Vote', async function () {
          castedVoteBefore = (await userDataContract0.call({method: 'casted_votes'}))[proposalId];
          votesToCast = (await userDataContract0.call({method: 'getDetails'})).token_balance;
          forVotesBefore = await proposal.call({method: 'forVotes'});
          againstVotesBefore = await proposal.call({method: 'againstVotes'});
          logger.log(`Account0 Cast Vote for Proposal ${proposalId}, amount: ${votesToCast.toString()}, support: True`)
          logger.log(`DaoAccount0 casted vote Before: ${castedVoteBefore}`)
          await userAccount0.runTarget({
            contract: stakingRoot,
            method: 'castVote',
            params: {
              proposal_id: proposalId,
              support: true
            }
          })
        });
        it('Check votes after', async function () {
          const forVotes = await proposal.call({method: 'forVotes'});
          const againstVotes = await proposal.call({method: 'againstVotes'});
          const castedVote = (await userDataContract0.call({method: 'casted_votes'}))[proposalId];
          logger.log(`Proposal ForVotes: ${forVotes.toString()}`);
          logger.log(`Proposal againstVotes: ${againstVotes.toString()}`);
          logger.log(`DaoAccount0 castedVote: ${castedVote}`);
          expect(forVotesBefore.plus(votesToCast).toString())
            .to
            .equal(forVotes.toString(), 'Wrong forVotes');
          expect(againstVotes.toString())
            .to
            .equal(againstVotesBefore.toString(), 'Wrong againstVotes');
          expect(castedVoteBefore)
            .to
            .equal(undefined, 'Wrong castedVote Before');
          expect(castedVote)
            .to
            .equal(true, 'Wrong castedVote');
        })
      })
      describe('Check votes [support=False]', async function () {
        let votesToCast;
        let forVotesBefore;
        let againstVotesBefore;
        let castedVotesBefore;
        before('Make vote support Vote', async function () {
          votesToCast = (await userDataContract1.call({method: 'getDetails'})).token_balance;
          forVotesBefore = await proposal.call({method: 'forVotes'});
          againstVotesBefore = await proposal.call({method: 'againstVotes'});
          castedVotesBefore = (await userDataContract1.call({method: 'casted_votes'}))[proposalId];
          logger.log(`Account1 Cast Vote for Proposal ${proposalId}, amount: ${votesToCast.toString()}, support: False`);
          logger.log(`DaoAccount1 castedVotes Before: ${castedVotesBefore}`);
          await userAccount1.runTarget({
            contract: stakingRoot,
            method: 'castVote',
            params: {
              proposal_id: proposalId,
              support: false
            },
          })
        });
        it('Check votes after', async function () {
          const forVotes = await proposal.call({method: 'forVotes'});
          const againstVotes = await proposal.call({method: 'againstVotes'});
          const castedVote = (await userDataContract1.call({method: 'casted_votes'}))[proposalId];
          logger.log(`Proposal ForVotes: ${forVotes.toString()}`);
          logger.log(`Proposal againstVotes: ${againstVotes.toString()}`);
          logger.log(`DaoAccount1 castedVote: ${castedVote}`);
          expect(againstVotesBefore.plus(votesToCast).toString())
            .to
            .equal(againstVotes.toString(), 'Wrong againstVotes');
          expect(forVotes.toString())
            .to
            .equal(forVotesBefore.toString(), 'Wrong forVotes');
          expect(castedVotesBefore)
            .to
            .equal(undefined, 'Wrong castedVotes Before');
          expect(castedVote)
            .to
            .equal(false, 'Wrong castedVote');
        })
      })
      describe('Check proposal execution', async function () {
        let timeLeft;
        before('Make vote support Vote', async function () {
          const voteEndTime = await proposal.call({method: 'endTime'});
          timeLeft = voteEndTime - Math.floor(Date.now() / 1000);
          logger.log(`Time left to vote end: ${timeLeft}`);
          await wait((timeLeft + 5) * 1000);
        });
        it('Check status after vote end', async function () {
          let state = await proposal.call({method: 'getState'});
          logger.log(`Current state: ${ProposalState[state]}`);
          expect(ProposalState[state])
            .to
            .equal('Succeeded', 'Wrong state');
        });
        it('Check proposal Queue', async function () {
          logger.log('Queue proposal');
          await proposal.run({method: 'queue'});
          state = await proposal.call({method: 'getState'});
          logger.log(`Current state: ${ProposalState[state]}`);
          expect(ProposalState[state])
            .to
            .equal('Queued', 'Wrong state');
        });
        it('Check proposal Executing', async function () {
          const targetExecutedBefore = await testTarget.call({method: 'executed'});

          expect(targetExecutedBefore)
            .to
            .equal(false, 'Wrong executed state in target before executing');

          logger.log('Executing proposal');
          await proposal.run({method: 'execute'});
          state = await proposal.call({method: 'getState'});
          logger.log(`Current state: ${ProposalState[state]}`);
          expect(ProposalState[state])
            .to
            .equal('Executed', 'Wrong state');
          await userAccount1.runTarget({
            contract: testTarget,
            method: 'call',
            params: {newParam},
          })
          await userAccount1.runTarget({
            contract: testTarget,
            method: 'call',
            params: {newParam: 0},
          })
          const targetExecuted = await testTarget.call({method: 'executed'});
          const targetParam = await testTarget.call({method: 'param'});
          expect(targetExecuted)
            .to
            .equal(true, 'Wrong executed state in target after executing');
          expect(targetParam.toNumber())
            .to
            .equal(newParam, 'Wrong target new param after executing');
        });
      })
      describe('Check unlock proposer vote tokens', async function () {
        it('Check votes amount after unlock', async function () {
          const lockedVotes = await userDataContract0.call({method: 'lockedTokens'});
          const totalVotes = (await userDataContract0.call({method: 'getDetails'})).token_balance;
          logger.log(`DaoAccount0 lockedVotes: ${lockedVotes.toString()}`);
          logger.log(`DaoAccount0 totalVotes: ${totalVotes.toString()}`);
          expect(lockedVotes.toNumber())
            .to
            .equal(0, 'Wrong locked votes');
        });
      });
      describe('Check unlock casted votes', async function () {
        let castedVotesBefore;
        let canWithdrawBefore;
        before('Unlock casted votes', async function () {
          castedVotesBefore = Object.keys(await userDataContract0.call({method: 'casted_votes'}));
          logger.log(`Casted votes before unlock: ${JSON.stringify(castedVotesBefore)}`);
          canWithdrawBefore = await userDataContract0.call({method: 'canWithdrawVotes'});
          logger.log(`Casted withdraw before unlock: ${canWithdrawBefore}`);
          await userAccount0.runTarget({
            contract: stakingRoot,
            method: 'tryUnlockCastedVotes',
            params: {proposal_ids: castedVotesBefore},
          });
        });
        it('Check casted votes before unlock', async function () {
          expect(canWithdrawBefore)
            .to
            .equal(false, 'Wrong canWithdrawVotes before');
        });
        it('Check casted votes after unlock', async function () {
          const castedVotes = Object.keys(await userDataContract0.call({method: 'casted_votes'}));
          logger.log(`Casted votes after unlock: ${JSON.stringify(castedVotes)}`);
          const canWithdraw = await userDataContract0.call({method: 'canWithdrawVotes'});
          logger.log(`Casted withdraw after unlock: ${canWithdraw}`);
          expect(canWithdraw)
            .to
            .equal(true, 'Wrong canWithdrawVotes after');
        });
      });
    });
  });
})
