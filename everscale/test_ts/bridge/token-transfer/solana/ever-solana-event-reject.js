const BigNumber = require("bignumber.js");
const {
  setupBridge,
  setupEverscaleSolanaEventConfiguration,
  setupRelays,
  MetricManager,
  enableEventConfiguration,
  captureConnectors,
  afterRun,
  logger,
  expect,
  getTokenWalletByAddress,
} = require('../../../utils');


describe('Test everscale solana event reject', async function() {
  this.timeout(10000000);

  let bridge, bridgeOwner, staking, cellEncoder;
  let everscaleSolanaEventConfiguration, proxy, initializer;
  let relays;
  let metricManager;
  let initializerTokenWallet;

  afterEach(async function() {
    const lastCheckPoint = metricManager.lastCheckPointName();
    const currentName = this.currentTest.title;

    await metricManager.checkPoint(currentName);

    if (lastCheckPoint === undefined) return;

    const difference = await metricManager.getDifference(lastCheckPoint, currentName);

    for (const [contract, balanceDiff] of Object.entries(difference)) {
      if (balanceDiff !== 0) {
        logger.log(`[Balance change] ${contract} ${locklift.utils.convertCrystal(balanceDiff, 'ton').toFixed(9)} Everscale`);
      }
    }
  });

  it('Setup bridge', async () => {
    relays = await setupRelays();

    [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

    [everscaleSolanaEventConfiguration, proxy, initializer] = await setupEverscaleSolanaEventConfiguration(
      bridgeOwner,
      staking
    );

    metricManager = new MetricManager(
      bridge, bridgeOwner, staking,
      everscaleSolanaEventConfiguration, initializer
    );
  });

  describe('Enable event configuration', async () => {
    it('Add event configuration to bridge', async () => {
      await enableEventConfiguration(
        bridgeOwner,
        bridge,
        everscaleSolanaEventConfiguration,
        'ton'
      );
    });

    it('Check configuration enabled', async () => {
      const configurations = await captureConnectors(bridge);

      expect(configurations['0'])
        .to.be.not.equal(undefined, 'Configuration not found');

      expect(configurations['0']._eventConfiguration)
        .to.be.equal(everscaleSolanaEventConfiguration.address, 'Wrong configuration address');

      expect(configurations['0']._enabled)
        .to.be.equal(true, 'Wrong connector status');
    });
  });

  let eventContract, tonEventParams, tonEventValue, burnPayload;

  describe('Initialize event', async () => {
    everEventValue = 444;
    everEventParams = {
      solanaOwnerAddress: 222,
      executeAccounts: [ {
        account: new BigNumber('42383474428106489994084969139012277140818210945614381322072008626484785752705').toFixed(),
        readOnly: true,
        isSigner: true
      }, {
        account: new BigNumber('42383474428106489994084969139012277140818210945614381322072008626484785752705').toFixed(),
        readOnly: false,
        isSigner: false
      }],
    }

    it('Setup event data', async () => {
      initializerTokenWallet = await getTokenWalletByAddress(initializer.address, await proxy.call({method: 'getTokenRoot'}));

      initializerTokenWallet.name = 'Initializer TokenWallet'
      burnPayload = await cellEncoder.call({
        method: 'encodeSolanaBurnPayload',
        params: everEventParams
      });
    });

    it('Initialize event', async () => {
      await initializer.runTarget({
        contract: initializerTokenWallet,
        method: 'burn',
        params: {
          amount: everEventValue,
          remainingGasTo: initializer.address,
          callbackTo: proxy.address,
          payload: burnPayload,
        },
        value: locklift.utils.convertCrystal(4, 'nano')
      });

      const events = await everscaleSolanaEventConfiguration.getEvents('NewEventContract');

      expect(events)
        .to.have.lengthOf(1, 'Everscale event configuration didnt deploy event');

      const [{
        value: {
          eventContract: expectedEventContract
        }
      }] = events;

      logger.log(`Expected event address: ${expectedEventContract}`);

      eventContract = await locklift.factory.getContract('TokenTransferEverscaleSolanaEvent');
      eventContract.setAddress(expectedEventContract);
      eventContract.afterRun = afterRun;
    });

    it('Check event initial state', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });

      expect(details._eventInitData.configuration)
        .to.be.equal(everscaleSolanaEventConfiguration.address, 'Wrong event configuration');

      expect(details._status)
        .to.be.bignumber.equal(1, 'Wrong status');

      expect(details._confirms)
        .to.have.lengthOf(0, 'Wrong amount of confirmations');

      expect(details._rejects)
        .to.have.lengthOf(0, 'Wrong amount of rejects');

      expect(details._initializer)
        .to.be.equal(proxy.address, 'Wrong initializer');
    });

    it('Check encoded event data', async () => {
      const data = await eventContract.call({ method: 'getDecodedData' });

      expect(data.senderAddress)
        .to.be.equal(initializer.address, 'Wrong owner address');

      expect(data.tokens)
        .to.be.bignumber.equal(everEventValue, 'Wrong amount of tokens');

      expect(data.solanaOwnerAddress)
          .to.be.bignumber.equal(everEventParams.solanaOwnerAddress, 'Wrong solana owner address');

    });
  });

  describe('Reject event', async () => {
    it('Reject event enough times', async () => {
      const requiredVotes = await eventContract.call({
        method: 'requiredVotes',
      });
      const rejects = [];
      for (const [relayId, relay] of Object.entries(relays.slice(0, requiredVotes))) {
        logger.log(`Reject #${relayId} from ${relay.public}`);

        rejects.push(eventContract.run({
          method: 'reject',
          params: {
            voteReceiver: eventContract.address
          },
          keyPair: relay
        }));
      }
      await Promise.all(rejects);
    });

    it('Check event rejected', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });

      const requiredVotes = await eventContract.call({
        method: 'requiredVotes',
      });

      expect(details.balance)
        .to.be.bignumber.equal(0, 'Wrong balance');

      expect(details._status)
        .to.be.bignumber.equal(3, 'Wrong status');

      expect(details._confirms)
        .to.have.lengthOf(0, 'Wrong amount of relays confirmations');

      expect(details._rejects)
        .to.have.lengthOf(requiredVotes, 'Wrong amount of relays rejects');
    });

    // it('Send confirms from the rest of relays', async () => {
    //   const requiredVotes = await eventContract.call({
    //     method: 'requiredVotes',
    //   });
    //
    //   for (const [relayId, relay] of Object.entries(relays.slice(requiredVotes))) {
    //     logger.log(`Reject #${requiredVotes.plus(relayId)} from ${relay.public}`);
    //
    //     await eventContract.run({
    //       method: 'reject',
    //       params: {
    //         voteReceiver: eventContract.address
    //       },
    //       keyPair: relay
    //     });
    //   }
    // });

    // it('Check event details after all relays voted', async () => {
    //   const details = await eventContract.call({
    //     method: 'getDetails'
    //   });
    //
    //   expect(details.balance)
    //     .to.be.bignumber.greaterThan(0, 'Wrong balance');
    //
    //   expect(details._status)
    //     .to.be.bignumber.equal(3, 'Wrong status');
    //
    //   expect(details._confirms)
    //     .to.have.lengthOf(0, 'Wrong amount of relays confirmations');
    //
    //   expect(details._rejects)
    //     .to.have.lengthOf(relays.length, 'Wrong amount of relays rejects');
    // });

    // it('Close event', async () => {
    //   await initializer.runTarget({
    //     contract: eventContract,
    //     method: 'close',
    //     params: {},
    //     value: locklift.utils.convertCrystal(1, 'nano')
    //   });
    //
    //   const details = await eventContract.call({
    //     method: 'getDetails'
    //   });
    //
    //   expect(details.balance)
    //     .to.be.bignumber.equal(0, 'Wrong balance');
    // });
  });
});
