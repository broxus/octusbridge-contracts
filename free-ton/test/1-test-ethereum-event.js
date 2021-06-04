const {
  setupBridge,
  setupEthereumEventConfiguration,
  setupRelays,
  logger,
} = require('./utils');

const chai = require('chai');
chai.use(require('chai-bignumber')());

const { expect } = chai;


describe('Test ethereum event', async function() {
  this.timeout(100000);
  
  let bridge, bridgeOwner, staking, cellEncoder;
  let ethereumEventConfiguration, proxy;
  let relays;
  
  describe('Setup bridge', async () => {
    it('Deploy bridge', async () => {
      [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge();
    });
  
    it('Setup ethereum event configuration', async () => {
      [ethereumEventConfiguration, proxy] = await setupEthereumEventConfiguration(
        bridgeOwner,
        bridge,
        cellEncoder,
      );
    });
  
    it(`Setup relays`, async () => {
      relays = await setupRelays();
    });
  });
  
  describe('Enable event configuration', async () => {
    it('Add event configuration to bridge', async () => {
      await bridgeOwner.runTarget({
        contract: bridge,
        method: 'createEventConfiguration',
        params: {
          id: 1,
          eventConfiguration: {
            addr: ethereumEventConfiguration.address,
            status: true,
            _type: 0
          }
        }
      });
    });
    
    it('Check active configurations', async () => {
      const activeConfigurations = await bridge.call({
        method: 'getActiveEventConfigurations',
      });
      
      expect(activeConfigurations.ids)
        .to.have.lengthOf(1, 'Wrong amount of active configurations');

      expect(activeConfigurations.ids[0])
        .to.be.bignumber.equal(1, 'Wrong configuration id');

      expect(activeConfigurations.addrs[0])
        .to.be.equal(ethereumEventConfiguration.address, 'Wrong configuration address');

      expect(activeConfigurations._types[0])
        .to.be.bignumber.equal(0, 'Wrong configuration type');
    });
  });
  
  describe('Confirm event', async () => {
    const eventDataStructure = {
      tokens: 100,
      wid: 0,
      owner_addr: 111,
      owner_pubkey: 222,
    };
  
    let eventConfirmParams;
    
    let eventContract;
    
    it('Create event', async () => {
      const eventData = await cellEncoder.call({
        method: 'encodeEthereumEventData',
        params: eventDataStructure
      });
  
      eventConfirmParams = {
        eventVoteData: {
          eventTransaction: 111,
          eventIndex: 222,
          eventData,
          eventBlockNumber: 333,
          eventBlock: 444,
          round: 555,
        },
        configurationID: 1,
      };
    });
    
    it('Initialize event', async () => {
      const tx = await relays[0].runTarget({
        contract: bridge,
        method: 'confirmEthereumEvent',
        params: eventConfirmParams,
        value: locklift.utils.convertCrystal(5, 'nano')
      });
  
      logger.log(`Event initialization tx: ${tx.transaction.id}`);
      
      const expectedEventAddress = await ethereumEventConfiguration.call({
        method: 'deriveEventAddress',
        params: {
          eventVoteData: eventConfirmParams.eventVoteData,
        }
      });
  
      logger.log(`Expected event address: ${expectedEventAddress}`);
      
      eventContract = await locklift.factory.getContract('EthereumEvent');
      eventContract.setAddress(expectedEventAddress);
    });
    
    
    it('Check event initial state', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });

      expect(details._initData.eventTransaction)
        .to.be.bignumber.equal(
          eventConfirmParams.eventVoteData.eventTransaction,
          'Wrong event transaction'
        );
  
      expect(details._initData.eventIndex)
        .to.be.bignumber.equal(
          eventConfirmParams.eventVoteData.eventIndex,
          'Wrong event index'
        );
  
      expect(details._initData.eventData)
        .to.be.equal(
          eventConfirmParams.eventVoteData.eventData,
          'Wrong event data'
        );
  
      expect(details._initData.eventBlockNumber)
        .to.be.bignumber.equal(
          eventConfirmParams.eventVoteData.eventBlockNumber,
          'Wrong event block number'
        );
  
      expect(details._initData.eventBlock)
        .to.be.bignumber.equal(
          eventConfirmParams.eventVoteData.eventBlock,
          'Wrong event block'
        );
  
      expect(details._initData.round)
        .to.be.bignumber.equal(
          eventConfirmParams.eventVoteData.round,
          'Wrong event round'
        );
      
      expect(details._initData.ethereumEventConfiguration)
        .to.be.equal(
          ethereumEventConfiguration.address,
        'Wrong event configuration'
        );
      
      expect(details._initData.requiredConfirmations)
        .to.be.bignumber.equal(
          2,
        'Wrong required confirmations'
      );
      
      expect(details._initData.requiredRejects)
        .to.be.bignumber.equal(
          2,
        'Wrong required rejects'
      );
      
      expect(details._initData.proxyAddress)
        .to.be.equal(
          proxy.address,
        'Wrong proxy'
      );
      
      expect(details._status)
        .to.be.bignumber.equal(
        0,
        'Wrong status'
      );
      
      expect(details._confirmRelays)
        .to.have.lengthOf(1, 'Wrong amount of relays confirmations');
      
      expect(details._rejectRelays)
        .to.have.lengthOf(0, 'Wrong amount of relays rejects');
      
      expect(details._confirmRelays)
        .to.include(relays[0].address,'Wrong relay initializer');
    });
  
    it('Check event data', async () => {
      const data = await eventContract.call({ method: 'getDecodedData' });

      expect(data.rootToken)
        .to.be.equal(locklift.utils.zeroAddress, 'Wrong root token');

      expect(data.tokens)
        .to.be.bignumber.equal(100, 'Wrong amount of tokens');

      expect(data.wid)
        .to.be.bignumber.equal(0, 'Wrong wid');

      expect(data.owner_addr)
        .to.be.bignumber.equal(111, 'Wrong owner address');

      expect(data.owner_pubkey)
        .to.be.bignumber.equal(222, 'Wrong owner pubkey');
    });

    it('Confirm event enough times', async () => {
      const {
        _initData: {
          requiredConfirmations
        }
      } = await eventContract.call({
        method: 'getDetails'
      });

      for (const relay of relays.slice(1, requiredConfirmations)) {
        logger.log(`Confirmation from ${relay.address}`);

        await relay.runTarget({
          contract: bridge,
          method: 'confirmEthereumEvent',
          params: eventConfirmParams
        });
      }
    });

    it('Check event confirmed', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });

      expect(details.balance)
        .to.be.bignumber.equal(0, 'Wrong balance');

      expect(details._status)
        .to.be.bignumber.equal(
        1,
        'Wrong status'
      );

      expect(details._confirmRelays)
        .to.have.lengthOf(2, 'Wrong amount of relays confirmations');

      expect(details._rejectRelays)
        .to.have.lengthOf(0, 'Wrong amount of relays rejects');
    });

    it('Execute event', async () => {
      await relays[0].runTarget({
        contract: eventContract,
        method: 'executeProxyCallback',
        value: locklift.utils.convertCrystal('1.5', 'nano')
      });
    });

    it('Check execution status', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });

      console.log(details);
    });
  });
  
  describe('Reject event', async () => {
    it('Create event', async () => {
    
    });
  
    it('Initialize event', async () => {
    
    });
  
    it('Reject event enough times', async () => {
    
    });
  });
  
  describe('Disable event configuration', async () => {
  
  });
});
