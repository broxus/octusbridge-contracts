const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('ton-testing-suite');
const _ = require('underscore');


let Bridge;
let ValidEthereumEventConfiguration;
let InvalidEthereumEventConfiguration;
let TonEventConfiguration;

let EthereumEventConfigurationContracts;


const tonWrapper = new freeton.TonWrapper({
  network: process.env.TON_NETWORK,
  seed: process.env.TON_SEED,
});


describe('Test event configurations', function() {
  this.timeout(12000000);

  before(async function() {
    await tonWrapper.setup();

    Bridge = await freeton
      .requireContract(tonWrapper, 'Bridge');
    await Bridge.loadMigration();
  
    ValidEthereumEventConfiguration = await freeton
      .requireContract(tonWrapper, 'EthereumEventConfiguration');
    await ValidEthereumEventConfiguration.loadMigration('valid');

    InvalidEthereumEventConfiguration = await freeton
      .requireContract(tonWrapper, 'EthereumEventConfiguration');
    await InvalidEthereumEventConfiguration.loadMigration('invalid');

    // Contract instance + Bridge configuration ID
    EthereumEventConfigurationContracts = {
      valid: [ValidEthereumEventConfiguration, 111],
      invalid: [InvalidEthereumEventConfiguration, 222]
    };
  
    TonEventConfiguration = await freeton
      .requireContract(tonWrapper, 'TonEventConfiguration');
    await TonEventConfiguration.loadMigration();
  
    logger.log(`Bridge address: ${Bridge.address}`);
    logger.log(`Valid Ethereum event configuration address: ${ValidEthereumEventConfiguration.address}`);
    logger.log(`Invalid Ethereum event configuration address: ${InvalidEthereumEventConfiguration.address}`);
    logger.log(`Valid TON event configuration address: ${TonEventConfiguration.address}`);
  });
  
  describe('Setup', async function() {
    it('Check initial state', async function() {
      for (const eventConfigurationID of [111, 222, 333]) {
        const {
          confirmKeys,
          rejectKeys,
          addr,
          status,
        } = await Bridge.runLocal('getEventConfigurationDetails', {
          id: eventConfigurationID,
        });
    
        expect(confirmKeys).to.have.lengthOf(0, `Non-empty confirmations for ${eventConfigurationID} configuration`);
        expect(rejectKeys).to.have.lengthOf(0, `Non-empty rejects for ${eventConfigurationID} configuration`);
        expect(status).to.equal(false, `Wrong status for ${eventConfigurationID} configuration`);
        expect(addr).to.equal(
          '0:0000000000000000000000000000000000000000000000000000000000000000',
          `Wrong address for ${eventConfigurationID} configuration`
        );
      }
    });
  });
  
  describe('Confirm Ethereum event configuration', async function() {
    it('Initialize event configurations', async function() {
      for (const [eventConfiguration, eventConfigurationID] of Object.values(EthereumEventConfigurationContracts)) {
        await Bridge.run('initializeEventConfigurationCreation', {
          id: eventConfigurationID,
          addr: eventConfiguration.address,
          _type: 0,
        }).catch(e => console.log(e));
  
        const {
          confirmKeys,
          rejectKeys,
          addr,
          status,
        } = await Bridge.runLocal('getEventConfigurationDetails', {
          id: eventConfigurationID,
        });
        
        expect(confirmKeys).to.have.length(1, `Empty confirmations for ${eventConfigurationID} configuration`);
        expect(rejectKeys).to.have.length(0, `Non-empty rejects for ${eventConfigurationID} configuration`);
        expect(addr).to.equal(eventConfiguration.address, `Wrong address for ${eventConfigurationID} configuration`);
        expect(status).to.equal(false, `Wrong status for ${eventConfigurationID} configuration`);
      }
    });

    it('Initialize already initialized configuration', async function() {
      await freeton.utils.catchRunFail(
        Bridge.run('initializeEventConfigurationCreation', {
          id: EthereumEventConfigurationContracts.valid[1],
          addr: EthereumEventConfigurationContracts.valid[0].address,
          _type: 0,
        }),
        5006,
      );
    });
    
    it('Reject configuration', async function() {
      const {
        eventConfigurationRequiredRejects,
      } = await Bridge.runLocal('getDetails');

      const [,eventConfigurationID] = EthereumEventConfigurationContracts.invalid;
      
      for (const keyId of _.range(eventConfigurationRequiredRejects.toString())) {
        await Bridge.run('voteForEventConfigurationCreation', {
          id: eventConfigurationID,
          vote: false,
        }, tonWrapper.keys[keyId]);
      }
  
      const {
        confirmKeys,
        rejectKeys,
        addr,
        status,
      } = await Bridge.runLocal('getEventConfigurationDetails', {
        id: eventConfigurationID,
      });
  
      expect(confirmKeys).to.have.lengthOf(0, `Non-empty confirmations for ${eventConfigurationID} configuration`);
      expect(rejectKeys).to.have.lengthOf(0, `Non-empty rejects for ${eventConfigurationID} configuration`);
      expect(status).to.equal(false, `Wrong status for ${eventConfigurationID} configuration`);
      expect(addr).to.equal(
        '0:0000000000000000000000000000000000000000000000000000000000000000',
        `Wrong address for ${eventConfigurationID} configuration`
      );
    });

    it('Confirm configuration', async function() {
      const {
        eventConfigurationRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');
  
      const [,eventConfigurationID] = EthereumEventConfigurationContracts.valid;
  
      for (const keyId of _.range(eventConfigurationRequiredConfirmations.toString())) {
        await Bridge.run('voteForEventConfigurationCreation', {
          id: eventConfigurationID,
          vote: true,
        }, tonWrapper.keys[keyId]);
      }
  
      const {
        confirmKeys,
        rejectKeys,
        addr,
        status,
      } = await Bridge.runLocal('getEventConfigurationDetails', {
        id: eventConfigurationID,
      });
      
      expect(confirmKeys).to.have.lengthOf(
        eventConfigurationRequiredConfirmations,
        `Wrong confirmations for ${eventConfigurationID} configuration`
      );

      expect(rejectKeys).to.have.lengthOf(0, `Non-empty rejects for ${eventConfigurationID} configuration`);
      expect(status).to.equal(true, `Wrong status for ${eventConfigurationID} configuration`);
      expect(addr).to.equal(
        ValidEthereumEventConfiguration.address,
        `Wrong address for ${eventConfigurationID} configuration`
      );
    });

    it('Initialize configuration with non-relay key', async function() {
      const arbitraryKeyPair = await tonWrapper.ton.crypto.ed25519Keypair();
  
      await freeton.utils.catchRunFail(
        Bridge.run('initializeEventConfigurationCreation', {
          addr: ValidEthereumEventConfiguration.address,
          id: 7777777,
          _type: 1,
        }, arbitraryKeyPair),
        5001
      );
    });
  });
  
  describe('Confirm TON event configuration', async function() {
    it('Initialize event configuration', async function() {
      const eventConfigurationID = 333;
      
      await Bridge.run('initializeEventConfigurationCreation', {
        id: eventConfigurationID,
        addr: TonEventConfiguration.address,
        _type: 1,
      }).catch(e => console.log(e));
  
      const {
        confirmKeys,
        rejectKeys,
        addr,
        status,
      } = await Bridge.runLocal('getEventConfigurationDetails', {
        id: eventConfigurationID,
      });
  
      expect(confirmKeys).to.have.length(1, `Empty confirmations for ${eventConfigurationID} configuration`);
      expect(rejectKeys).to.have.length(0, `Non-empty rejects for ${eventConfigurationID} configuration`);
      expect(addr).to.equal(TonEventConfiguration.address, `Wrong address for ${eventConfigurationID} configuration`);
      expect(status).to.equal(false, `Wrong status for ${eventConfigurationID} configuration`);
    });

    it('Confirm configuration', async function() {
      const {
        eventConfigurationRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');

      const eventConfigurationID = 333;

      for (const keyId of _.range(eventConfigurationRequiredConfirmations.toString())) {
        await Bridge.run('voteForEventConfigurationCreation', {
          id: eventConfigurationID,
          vote: true,
        }, tonWrapper.keys[keyId]);
      }
  
      const {
        confirmKeys,
        rejectKeys,
        addr,
        status,
      } = await Bridge.runLocal('getEventConfigurationDetails', {
        id: eventConfigurationID,
      });
  
      expect(confirmKeys).to.have.lengthOf(
        eventConfigurationRequiredConfirmations,
        `Wrong confirmations for ${eventConfigurationID} configuration`
      );
      expect(rejectKeys).to.have.lengthOf(0, `Non-empty rejects for ${eventConfigurationID} configuration`);
      expect(status).to.equal(true, `Wrong status for ${eventConfigurationID} configuration`);
      expect(addr).to.equal(
        TonEventConfiguration.address,
        `Wrong address for ${eventConfigurationID} configuration`
      );
    });
  });
  
  describe('Update Ethereum event configuration', async function() {
    let updateParams;

    it('Initialize update', async function() {
      const {
        _basicInitData: basicInitData,
        _initData: ethereumInitData,
      } = await ValidEthereumEventConfiguration.runLocal('getDetails');
      
      const {
        _initData: tonInitData
      } = await TonEventConfiguration.runLocal('getDetails');
      
      const NEW_ABI = `{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"state","type":"uint256"}],"name":"EthereumStateChange","type":"event"}`;

      updateParams = {
        id: 8888,
        targetID: 111,
        addr: ValidEthereumEventConfiguration.address, // Don't change the address
        basicInitData: { // Update ABI
          ...basicInitData,
          eventABI: freeton.utils.stringToBytesArray(NEW_ABI),
        },
        ethereumInitData,
        tonInitData,
      };
      
      await Bridge.run('initializeUpdateEventConfiguration', updateParams);
      
      const details = await Bridge.runLocal('getUpdateEventConfigurationDetails', {
        id: updateParams.id,
      });
      
      expect(details.confirmKeys).to.have.lengthOf(1, 'Wrong confirmations amount');
      expect(details.rejectKeys).to.have.lengthOf(0, 'Wrong rejects amount');
      expect(details.targetID.toNumber()).to.equal(111, 'Wrong target ID');
      expect(details.addr).to.equal(
        ValidEthereumEventConfiguration.address,
        'Wrong event configuration address'
      );
      expect(details.basicInitData.eventABI.toString('hex'))
        .to
        .equal(updateParams.basicInitData.eventABI, 'Wrong ABI');
    });
    
    it('Initialize already initialized update', async function() {
      await freeton.utils.catchRunFail(
        Bridge.run('initializeUpdateEventConfiguration', updateParams),
        5008
      );
    });
    
    it('Initialize update for non-existing configuration', async function() {
      await freeton.utils.catchRunFail(
        Bridge.run('initializeUpdateEventConfiguration', {
          ...updateParams,
          id: 999999,
          targetID: 6,
        }),
        5005
      );
    });
    
    it('Confirm update with non-relay key', async function() {
      const arbitraryKeyPair = await tonWrapper.ton.crypto.ed25519Keypair();
  
      await freeton.utils.catchRunFail(
        Bridge.run('initializeUpdateEventConfiguration', {
          ...updateParams,
          id: 999999,
        }, arbitraryKeyPair),
        5001
      );
    });
    
    it('Confirm configuration update', async function() {
      const {
        eventConfigurationRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');
  
      for (const keyId of _.range(eventConfigurationRequiredConfirmations.toString())) {
        await Bridge.run('voteForUpdateEventConfiguration', {
          id: updateParams.id,
          vote: true,
        }, tonWrapper.keys[keyId]);
      }
  
      const details = await Bridge.runLocal('getUpdateEventConfigurationDetails', {
        id: updateParams.id,
      });
  
      expect(details.confirmKeys).to.have.lengthOf(0, 'Wrong confirmations amount');
      expect(details.rejectKeys).to.have.lengthOf(0, 'Wrong rejects amount');
      expect(details.targetID.toNumber()).to.equal(0, 'Wrong target ID');
      
      // Check the EventConfiguration contract
      const configurationDetails = await ValidEthereumEventConfiguration.runLocal('getDetails');
      
      expect(configurationDetails._basicInitData.eventABI.toString('hex'))
        .to
        .equal(updateParams.basicInitData.eventABI, 'Wrong ABI');
    });
  });

  describe('Finish', async function() {
    it('Check active configurations', async function() {
      const {
        ids,
      } = await Bridge.runLocal('getActiveEventConfigurations');
      
      // console.log(ids);
      //
      // expect(ids).to.have.lengthOf(2, 'Wrong active configurations amount');
      // expect(ids.map(c => c.toNumber()))
      //   .to
      //   .have
      //   .members([111, 333], 'Wrong active configurations')
      //   .but
      //   .not
      //   .members([222], 'Configuration should be in-active');
    });
  });
});
