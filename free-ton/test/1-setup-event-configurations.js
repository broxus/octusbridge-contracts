const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('ton-testing-suite');
const _ = require('underscore');

const BigNumber = require('bignumber.js');
BigNumber.config({ EXPONENTIAL_AT: 257 });

const utils = require('./utils');


let Bridge;
let ValidEthereumEventConfiguration;
let InvalidEthereumEventConfiguration;
let TonEventConfiguration;

let EthereumEventConfigurationContracts;


const tonWrapper = new freeton.TonWrapper({
  network: process.env.TON_NETWORK,
  seed: process.env.TON_SEED,
});

const relaysManager = new utils.RelaysManager(
  parseInt(process.env.RELAYS_AMOUNT),
  tonWrapper,
);

describe('Test event configurations', function() {
  this.timeout(12000000);
  
  before(async function() {
    await tonWrapper.setup();
    await relaysManager.setup();
    
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
          confirmRelays,
          rejectRelays,
          addr,
          status,
        } = await Bridge.runLocal('getEventConfigurationDetails', {
          id: eventConfigurationID,
        });
        
        expect(confirmRelays).to.have.lengthOf(0, `Non-empty confirmations for ${eventConfigurationID} configuration`);
        expect(rejectRelays).to.have.lengthOf(0, `Non-empty rejects for ${eventConfigurationID} configuration`);
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
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'initializeEventConfigurationCreation',
          input: {
            id: eventConfigurationID,
            addr: eventConfiguration.address,
            _type: 0,
          },
          value: freeton.utils.convertCrystal('1', 'nano'),
        });
        
        const {
          confirmRelays,
          rejectRelays,
          addr,
          status,
        } = await Bridge.runLocal('getEventConfigurationDetails', {
          id: eventConfigurationID,
        });

        expect(confirmRelays).to.have.length(1, `Empty confirmations for ${eventConfigurationID} configuration`);
        expect(rejectRelays).to.have.length(0, `Non-empty rejects for ${eventConfigurationID} configuration`);
        expect(addr).to.equal(eventConfiguration.address, `Wrong address for ${eventConfigurationID} configuration`);
        expect(status).to.equal(false, `Wrong status for ${eventConfigurationID} configuration`);
      }
    });
    
    it('Initialize already initialized configuration', async function() {
      // const status = await relaysManager.runTarget({
      //   contract: Bridge,
      //   method: 'initializeEventConfigurationCreation',
      //   input: {
      //     id: EthereumEventConfigurationContracts.valid[1],
      //     addr: EthereumEventConfigurationContracts.valid[0].address,
      //     _type: 0,
      //   },
      // });
      //
      // console.log(status);
    });

    it('Reject configuration', async function() {
      const {
        bridgeUpdateRequiredRejects,
      } = await Bridge.runLocal('getDetails');

      const [,eventConfigurationID] = EthereumEventConfigurationContracts.invalid;

      for (const keyId of _.range(bridgeUpdateRequiredRejects.toString())) {
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'voteForEventConfigurationCreation',
          input: {
            id: eventConfigurationID,
            vote: false,
          },
          value: freeton.utils.convertCrystal('1', 'nano'),
        }, keyId);
      }

      const {
        confirmRelays,
        rejectRelays,
        addr,
        status,
      } = await Bridge.runLocal('getEventConfigurationDetails', {
        id: eventConfigurationID,
      });

      expect(confirmRelays).to.have.lengthOf(0, `Non-empty confirmations for ${eventConfigurationID} configuration`);
      expect(rejectRelays).to.have.lengthOf(0, `Non-empty rejects for ${eventConfigurationID} configuration`);
      expect(status).to.equal(false, `Wrong status for ${eventConfigurationID} configuration`);
      expect(addr).to.equal(
        '0:0000000000000000000000000000000000000000000000000000000000000000',
        `Wrong address for ${eventConfigurationID} configuration`
      );
    });

    it('Confirm configuration', async function() {
      const {
        bridgeUpdateRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');

      const [,eventConfigurationID] = EthereumEventConfigurationContracts.valid;

      for (const keyId of _.range(bridgeUpdateRequiredConfirmations.toString())) {
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'voteForEventConfigurationCreation',
          input: {
            id: eventConfigurationID,
            vote: true,
          },
          value: freeton.utils.convertCrystal('1', 'nano'),
        }, keyId);
      }

      const {
        confirmRelays,
        rejectRelays,
        addr,
        status,
      } = await Bridge.runLocal('getEventConfigurationDetails', {
        id: eventConfigurationID,
      });

      expect(confirmRelays).to.have.lengthOf(
        bridgeUpdateRequiredConfirmations,
        `Wrong confirmations for ${eventConfigurationID} configuration`
      );

      expect(rejectRelays).to.have.lengthOf(0, `Non-empty rejects for ${eventConfigurationID} configuration`);
      expect(status).to.equal(true, `Wrong status for ${eventConfigurationID} configuration`);
      expect(addr).to.equal(
        ValidEthereumEventConfiguration.address,
        `Wrong address for ${eventConfigurationID} configuration`
      );
    });

    // it('Initialize configuration with non-relay key', async function() {
    //   const arbitraryKeyPair = await tonWrapper.ton.crypto.generate_random_sign_keys();
    //
    //   await freeton.utils.catchRunFail(
    //     Bridge.run('initializeEventConfigurationCreation', {
    //       addr: ValidEthereumEventConfiguration.address,
    //       id: 7777777,
    //       _type: 1,
    //     }, arbitraryKeyPair),
    //     5001
    //   );
    // });
  });
  
  describe('Confirm TON event configuration', async function() {
    it('Initialize event configuration', async function() {
      const eventConfigurationID = 333;
      
      await relaysManager.runTarget({
        contract: Bridge,
        method: 'initializeEventConfigurationCreation',
        input: {
          id: eventConfigurationID,
          addr: TonEventConfiguration.address,
          _type: 1,
        },
        value: freeton.utils.convertCrystal('1', 'nano'),
      });
  
      const {
        confirmRelays,
        rejectRelays,
        addr,
        status,
      } = await Bridge.runLocal('getEventConfigurationDetails', {
        id: eventConfigurationID,
      });

      expect(confirmRelays).to.have.length(1, `Empty confirmations for ${eventConfigurationID} configuration`);
      expect(rejectRelays).to.have.length(0, `Non-empty rejects for ${eventConfigurationID} configuration`);
      expect(addr).to.equal(TonEventConfiguration.address, `Wrong address for ${eventConfigurationID} configuration`);
      expect(status).to.equal(false, `Wrong status for ${eventConfigurationID} configuration`);
    });

    it('Confirm configuration', async function() {
      const {
        bridgeUpdateRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');

      const eventConfigurationID = 333;

      for (const keyId of _.range(bridgeUpdateRequiredConfirmations.toString())) {
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'voteForEventConfigurationCreation',
          input: {
            id: eventConfigurationID,
            vote: true,
          },
          value: freeton.utils.convertCrystal('1', 'nano'),
        }, keyId);
      }

      const {
        confirmRelays,
        rejectRelays,
        addr,
        status,
      } = await Bridge.runLocal('getEventConfigurationDetails', {
        id: eventConfigurationID,
      });
      
      expect(confirmRelays).to.have.lengthOf(
        bridgeUpdateRequiredConfirmations,
        `Wrong confirmations for ${eventConfigurationID} configuration`
      );
      expect(rejectRelays).to.have.lengthOf(0, `Non-empty rejects for ${eventConfigurationID} configuration`);
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

      updateParams = {
        id: 8888,
        targetID: 111,
        addr: ValidEthereumEventConfiguration.address, // Don't change the address
        basicInitData: {
          ...basicInitData,
          eventABI: basicInitData.eventABI.toString('hex'),
          eventInitialBalance: freeton.utils.convertCrystal('9', 'nano'),
        },
        ethereumInitData,
        tonInitData,
      };
      
      await relaysManager.runTarget({
        contract: Bridge,
        method: 'initializeUpdateEventConfiguration',
        input: updateParams,
        value: freeton.utils.convertCrystal('1', 'nano'),
      });

      const details = await Bridge.runLocal('getUpdateEventConfigurationDetails', {
        id: updateParams.id,
      });

      expect(details.confirmRelays).to.have.lengthOf(1, 'Wrong confirmations amount');
      expect(details.rejectRelays).to.have.lengthOf(0, 'Wrong rejects amount');
      expect(details.targetID.toNumber()).to.equal(111, 'Wrong target ID');
      expect(details.addr).to.equal(
        ValidEthereumEventConfiguration.address,
        'Wrong event configuration address'
      );
    });

    // it('Initialize already initialized update', async function() {
    //   await freeton.utils.catchRunFail(
    //     Bridge.run('initializeUpdateEventConfiguration', updateParams),
    //     5008
    //   );
    // });

    // it('Initialize update for non-existing configuration', async function() {
      // await freeton.utils.catchRunFail(
      //   relaysManager.runTarget({
      //     contract: Bridge,
      //     method: 'initializeUpdateEventConfiguration',
      //     input: {
      //       ...updateParams,
      //       id: 999999,
      //       targetID: 6,
      //       value: freeton.utils.convertCrystal('1', 'nano'),
      //     },
      //   }),
      //   5005
      // );
    // });

    // it('Confirm update with non-relay key', async function() {
    //   const arbitraryKeyPair = await tonWrapper.ton.crypto.generate_random_sign_keys();
    //
    //   // TODO: simplify params, sometimes they don't fit into the tvm.accept credit
    //   // await freeton.utils.catchRunFail(
    //   //   Bridge.run('initializeUpdateEventConfiguration', {
    //   //     ...updateParams,
    //   //     id: 999999,
    //   //   }, arbitraryKeyPair),
    //   //   5001
    //   // );
    // });

    it('Confirm configuration update', async function() {
      const {
        bridgeUpdateRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');

      for (const keyId of _.range(bridgeUpdateRequiredConfirmations.toString())) {
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'voteForUpdateEventConfiguration',
          input: {
            id: updateParams.id,
            vote: true,
          },
          value: freeton.utils.convertCrystal('1', 'nano'),
        }, keyId);
      }

      const details = await Bridge.runLocal('getUpdateEventConfigurationDetails', {
        id: updateParams.id,
      });

      expect(details.confirmRelays).to.have.lengthOf(0, 'Wrong confirmations amount');
      expect(details.rejectRelays).to.have.lengthOf(0, 'Wrong rejects amount');
      expect(details.targetID.toNumber()).to.equal(0, 'Wrong target ID');

      // Check the EventConfiguration contract
      const configurationDetails = await ValidEthereumEventConfiguration.runLocal('getDetails');
      
      expect(configurationDetails._basicInitData.eventInitialBalance.toString())
        .to
        .equal(updateParams.basicInitData.eventInitialBalance, 'Wrong updated event initial balance');
    });
  });

  describe('Finish', async function() {
    it('Check active configurations', async function() {
      const {
        ids,
      } = await Bridge.runLocal('getActiveEventConfigurations');
      
      expect(ids).to.have.lengthOf(2, 'Wrong active configurations amount');
      expect(ids.map(i => parseInt(i)))
        .to
        .have
        .members([111, 333], 'Wrong active configurations')
        .but
        .not
        .members([222], 'Configuration should be in-active');
    });
  });
});
