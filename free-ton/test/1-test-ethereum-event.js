const {
  setupBridge,
  setupEthereumEventConfiguration,
  setupRelays,
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
          eventTransaction: 1,
          eventIndex: 1,
          eventData,
          eventBlockNumber: 1,
          eventBlock: 1,
          round: 1,
        },
        configurationID: 1,
      };
    });
    
    it('Initialize event', async () => {
      await relays[0].runTarget({
        contract: bridge,
        method: 'confirmEthereumEvent',
        params: eventConfirmParams
      });
  
      const expectedEventAddress = await ethereumEventConfiguration.call({
        method: 'deriveEventAddress',
        params: {
          eventVoteData: eventConfirmParams.eventVoteData,
        }
      });
  
      eventContract = await locklift.factory.getContract('EthereumEvent');
      eventContract.setAddress(expectedEventAddress);
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
    
    it('Check event initial state', async () => {
      const details = await eventContract.call({
        method: 'getDetails'
      });
      
      console.log(details);
    });
    
    it('Confirm event enough times', async () => {
    
    });
    
    it('Check event status', async () => {
    
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
