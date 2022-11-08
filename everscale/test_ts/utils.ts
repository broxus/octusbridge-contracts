import {Address, Contract, Signer, WalletTypes} from "locklift";
import {FactorySource} from "../build/factorySource";
import {Account} from "everscale-standalone-client/nodejs";
import {ed25519_generateKeyPair} from "nekoton-wasm";

const logger = require('mocha-logger');
const BigNumber = require('bignumber.js');
const _ = require('underscore');

const {zeroAddress} = require("locklift");

const logContract = async (name: string, address: Address) => {

    const balance = await locklift.provider.getBalance(address);

    logger.log(`${name} (${address}) - ${locklift.utils.fromNano(balance)}`);
};

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class MetricManager {
    contracts: [{ name: string, address: Address }];
    checkpoints: { [key: string]: number[] };

    constructor(...contracts: [{ name: string, address: Address }]) {
        this.contracts = contracts;
        this.checkpoints = {};
    }

    lastCheckPointName() {
        return Object.keys(this.checkpoints).pop();
    }

    async checkPoint(name: string) {
        const balances: number[] = await Promise.all(this.contracts.map(async (contract) =>
            locklift.provider.getBalance(contract.address)).map(async (value) => parseInt(await value, 10)));

        this.checkpoints[name] = balances;
    }

    getCheckPoint(name: string) {
        const checkpoint = this.checkpoints[name];

        if (!checkpoint) throw new Error(`No checkpoint "${name}"`);

        return checkpoint;
    }

    async getDifference(startCheckPointName: string, endCheckPointName: string) {
        const startCheckPoint = this.getCheckPoint(startCheckPointName);
        const endCheckPoint = this.getCheckPoint(endCheckPointName);

        const difference: { [key: string]: number } = {};

        for (const [startMetric, endMetric, contract] of _.zip(startCheckPoint, endCheckPoint, this.contracts)) {
            difference[contract.name] = endMetric - startMetric;
        }

        return difference;
    }

    addContract(contract: { name: string, address: Address }, fill = 0) {
        this.contracts.push(contract);

        for (const checkpoint of Object.keys(this.checkpoints)) {
            this.checkpoints[checkpoint].push(fill);
        }
    }
}


const setupBridge = async (relays: any[]) => {
    const signer = (await locklift.keystore.getSigner("0"))!;

    const _randomNonce = locklift.utils.getRandomNonce();

    const owner = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3, // or WalletTypes.HighLoadWallet,
        //Value which will send to the new account from a giver
        value: locklift.utils.toNano(30),
        //owner publicKey
        publicKey: signer.publicKey,
    });

    await logContract("owner address", owner.account.address);

    const {contract: staking} = await locklift.factory.deployContract({
        contract: 'StakingMockup',
        constructorParams: {},
        initParams: {
            _randomNonce,
            __keys: relays.map(r => `0x${r.public}`),
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1),
    });

    await logContract("staking", staking.address);

    const connectorData = await locklift.factory.getContractArtifacts("Connector");

    const {contract: bridge} = await locklift.factory.deployContract({
        contract: 'Bridge',
        constructorParams: {
            _owner: owner.account.address,
            _manager: owner.account.address,
            _staking: staking.address,
            _connectorCode: connectorData.code,
            _connectorDeployValue: locklift.utils.toNano(1),
        },
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce(),
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(2),
    });

    await logContract("bridge", bridge.address);

    const {contract: cellEncoder} = await locklift.factory.deployContract({
        contract: 'CellEncoderStandalone',
        constructorParams: {},
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce(),
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1),
    });

    await logContract("cellEncoder", cellEncoder.address);

    return [bridge, owner.account, staking, cellEncoder];
};


const setupEthereumEverscaleEventConfiguration = async (owner: Account, staking: Contract<FactorySource["StakingMockup"]>) => {
    const signer = (await locklift.keystore.getSigner("1"))!;

    const configurationMeta = '';

    const _randomNonce = locklift.utils.getRandomNonce();

    const proxyData = await locklift.factory.getContractArtifacts('ProxyTokenTransfer');

    const proxyFutureAddress = await locklift.provider.getExpectedAddress(
        proxyData.abi,
        {
            tvc: proxyData.tvc,
            initParams: {
                _randomNonce,
            },
            publicKey: signer.publicKey,
            workchain: 0
        });

    const tokenRoot = await setupTokenRootWithWallet(
        proxyFutureAddress,
        parseInt(locklift.utils.toNano('100'), 10)
    );

    const ethereumEventData = await locklift.factory.getContractArtifacts('TokenTransferEthereumEverscaleEvent');

    const {contract: ethereumEverscaleEventConfiguration} = await locklift.factory.deployContract({
        contract: 'EthereumEverscaleEventConfiguration',
        constructorParams: {
            _owner: owner.address,
            _meta: configurationMeta,
        },
        initParams: {
            basicConfiguration: {
                eventABI: '',
                eventInitialBalance: locklift.utils.toNano(2),
                staking: staking.address,
                eventCode: ethereumEventData.code,
            },
            networkConfiguration: {
                chainId: 1,
                eventEmitter: new BigNumber(0),
                eventBlocksToConfirm: 1,
                proxy: proxyFutureAddress,
                startBlockNumber: 0,
                endBlockNumber: 0,
            }
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("ethereumEverscaleEventConfiguration", ethereumEverscaleEventConfiguration.address);

    const {contract: proxy} = await locklift.factory.deployContract({
        contract: 'ProxyTokenTransfer',
        constructorParams: {
            owner_: owner.address,
        },
        initParams: {
            _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("proxy", proxy.address);

    const proxyConfiguration = {
        everscaleEthereumConfiguration: zeroAddress,
        ethereumEverscaleConfigurations: [ethereumEverscaleEventConfiguration.address],
        everscaleSolanaConfiguration: zeroAddress,
        solanaEverscaleConfiguration: zeroAddress,
        outdatedTokenRoots: [],
        tokenRoot: tokenRoot.address,
        settingsDeployWalletGrams: locklift.utils.toNano(0.1)
    }

    await proxy.methods.setConfiguration({
        _config: proxyConfiguration,
        gasBackAddress: owner.address
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
    });

    const initializer = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3, // or WalletTypes.HighLoadWallet,
        //Value which will send to the new account from a giver
        value: locklift.utils.toNano(10),
        //owner publicKey
        publicKey: signer.publicKey,
    });

    await logContract("initializer address", initializer.account.address);

    return [ethereumEverscaleEventConfiguration, proxy, initializer.account];
};

const setupSolanaEverscaleEventConfiguration = async (owner: Account, staking: Contract<FactorySource["StakingMockup"]>) => {
    const signer = (await locklift.keystore.getSigner("1"))!;

    const _randomNonce = locklift.utils.getRandomNonce();

    const proxyData = await locklift.factory.getContractArtifacts('ProxyTokenTransfer');

    const proxyFutureAddress = await locklift.provider.getExpectedAddress(
        proxyData.abi,
        {
            tvc: proxyData.tvc,
            initParams: {
                _randomNonce,
            },
            publicKey: signer.publicKey,
            workchain: 0
        });

    const tokenRoot = await setupTokenRootWithWallet(
        proxyFutureAddress,
        parseInt(locklift.utils.toNano('100'), 10)
    );

    const solanaEverscaleEventConfigurationData = await locklift.factory.getContractArtifacts('SolanaEverscaleEventConfiguration');
    const solanaEventData = await locklift.factory.getContractArtifacts('TokenTransferSolanaEverscaleEvent');

    const {contract: factory} = await locklift.factory.deployContract({
        contract: 'SolanaEverscaleEventConfigurationFactory',
        constructorParams: {
            _configurationCode: solanaEverscaleEventConfigurationData.code
        },
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce(),
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("SolanaEverscaleEventConfigurationFactory address", factory.address);

    const basicConfiguration = {
        eventABI: '',
        eventInitialBalance: locklift.utils.toNano(2),
        staking: staking.address,
        eventCode: solanaEventData.code,
    };

    const networkConfiguration = {
        program: new BigNumber(0),
        settings: new BigNumber(0),
        proxy: proxyFutureAddress,
        startTimestamp: 0,
        endTimestamp: 0,
    };

    await factory.methods.deploy({
        _owner: owner.address,
        basicConfiguration,
        networkConfiguration
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
    });

    let solanaEverscaleEventConfigurationAddress = await factory.methods.deriveConfigurationAddress({
            basicConfiguration,
            networkConfiguration
    }).call();

    const solanaEverscaleEventConfiguration = locklift.factory.getDeployedContract(
        "SolanaEverscaleEventConfiguration",
        solanaEverscaleEventConfigurationAddress.value0,
    );

    await logContract("SolanaEverscaleEventConfiguration address", solanaEverscaleEventConfiguration.address);

    const {contract: proxy} = await locklift.factory.deployContract({
        contract: 'ProxyTokenTransfer',
        constructorParams: {
            owner_: owner.address,
        },
        initParams: {
            _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("ProxyTokenTransfer address" , proxy.address);

    const proxyConfiguration = {
        everscaleEthereumConfiguration: zeroAddress,
        ethereumEverscaleConfigurations: [],
        everscaleSolanaConfiguration: zeroAddress,
        solanaEverscaleConfiguration: solanaEverscaleEventConfiguration.address,
        outdatedTokenRoots: [],
        tokenRoot: tokenRoot.address,
        settingsDeployWalletGrams: locklift.utils.toNano(0.1)
    }

    await proxy.methods.setConfiguration({
        _config: proxyConfiguration,
        gasBackAddress: owner.address
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
    });

    const initializer = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3, // or WalletTypes.HighLoadWallet,
        //Value which will send to the new account from a giver
        value: locklift.utils.toNano(10),
        //owner publicKey
        publicKey: signer.publicKey,
    });

    await logContract("initializer address", initializer.account.address);

    return [solanaEverscaleEventConfiguration, proxy, initializer.account];
};

const setupSolanaEverscaleEventConfigurationReal = async (owner: Account, staking: Contract<FactorySource["StakingMockup"]>) => {
    const signer = (await locklift.keystore.getSigner("1"))!;

    const _randomNonce = locklift.utils.getRandomNonce();

    const proxyData = await locklift.factory.getContractArtifacts('ProxyTokenTransfer');

    const proxyFutureAddress = await locklift.provider.getExpectedAddress(
        proxyData.abi,
        {
            tvc: proxyData.tvc,
            initParams: {
                _randomNonce,
            },
            publicKey: signer.publicKey,
            workchain: 0
        });


    const tokenRoot = await setupTokenRootWithWallet(
        proxyFutureAddress,
        parseInt(locklift.utils.toNano('100'), 10)
    );

    const solanaEverscaleEventConfigurationData = await locklift.factory.getContractArtifacts('SolanaEverscaleEventConfiguration');
    const solanaEventData = await locklift.factory.getContractArtifacts('TokenTransferSolanaEverscaleEvent');

    const {contract: factory} = await locklift.factory.deployContract({
        contract: 'SolanaEverscaleEventConfigurationFactory',
        constructorParams: {
            _configurationCode: solanaEverscaleEventConfigurationData.code
        },
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce(),
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("SolanaEverscaleEventConfigurationFactory address", factory.address);

    const basicConfiguration = {
        eventABI: stringToBytesArray(JSON.stringify([{"name": "sender_addr", "type": "uint256"}, {
            "name": "tokens",
            "type": "uint128"
        }, {"name": "receiver_addr", "type": "address"}])),
        eventInitialBalance: locklift.utils.toNano(2),
        staking: staking.address,
        eventCode: solanaEventData.code,
    };

    const networkConfiguration = {
        program: new BigNumber('64325431755338481809989759803115734914716347278988009080185460755052753533847').toFixed(),
        settings: new BigNumber('57841592085658898909210956009470529174855388447817017254133095023581205672081').toFixed(),
        proxy: proxyFutureAddress,
        startTimestamp: 0,
        endTimestamp: 0,
    };

    await factory.methods.deploy({
        _owner: owner.address,
        basicConfiguration,
        networkConfiguration
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
    });

    let solanaEverscaleEventConfigurationAddress = await factory.methods.deriveConfigurationAddress({
        basicConfiguration,
        networkConfiguration
    }).call();

    const solanaEverscaleEventConfiguration = locklift.factory.getDeployedContract(
        "SolanaEverscaleEventConfiguration",
        solanaEverscaleEventConfigurationAddress.value0,
    );

    await logContract("SolanaEverscaleEventConfiguration address", solanaEverscaleEventConfiguration.address);

    const everscaleSolanaEventConfigurationData = await locklift.factory.getContractArtifacts('EverscaleSolanaEventConfiguration');

    const {contract: everFactory} = await locklift.factory.deployContract({
        contract: 'EverscaleSolanaEventConfigurationFactory',
        constructorParams: {
            _configurationCode: everscaleSolanaEventConfigurationData.code
        },
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce(),
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("EverscaleSolanaEventConfigurationFactory address", everFactory.address);

    const everEventData = await locklift.factory.getContractArtifacts('TokenTransferEverscaleSolanaEvent');

    const everBasicConfiguration = {
        eventABI: stringToBytesArray(JSON.stringify([{"name": "sender_addr", "type": "address"}, {
            "name": "tokens",
            "type": "uint128"
        }, {"name": "receiver_addr", "type": "uint256"}])),
        eventInitialBalance: locklift.utils.toNano(2),
        staking: staking.address,
        eventCode: everEventData.code,
    };

    const everNetworkConfiguration = {
        program: new BigNumber('64325431755338481809989759803115734914716347278988009080185460755052753533847').toFixed(),
        settings: new BigNumber('57841592085658898909210956009470529174855388447817017254133095023581205672081').toFixed(),
        eventEmitter: proxyFutureAddress,
        instruction: 0,
        executeInstruction: 0,
        executeNeeded: false,
        startTimestamp: 0,
        endTimestamp: 1672365744,
    };


    await everFactory.methods.deploy({
        _owner: owner.address,
        basicConfiguration: everBasicConfiguration,
        networkConfiguration: everNetworkConfiguration,
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
    });

    let everscaleSolanaEventConfigurationAddress = await everFactory.methods.deriveConfigurationAddress({
        basicConfiguration: everBasicConfiguration,
        networkConfiguration: everNetworkConfiguration
    }).call();

    const everscaleSolanaEventConfiguration = locklift.factory.getDeployedContract(
        "EverscaleSolanaEventConfiguration",
        everscaleSolanaEventConfigurationAddress.value0,
    );

    await logContract("everscaleSolanaEventConfiguration address", everscaleSolanaEventConfiguration.address);

    const {contract: proxy} = await locklift.factory.deployContract({
        contract: 'ProxyTokenTransfer',
        constructorParams: {
            owner_: owner.address,
        },
        initParams: {
            _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("ProxyTokenTransfer address" , proxy.address);

    const proxyConfiguration = {
        everscaleEthereumConfiguration: zeroAddress,
        ethereumEverscaleConfigurations: [],
        everscaleSolanaConfiguration: everscaleSolanaEventConfiguration.address,
        solanaEverscaleConfiguration: solanaEverscaleEventConfiguration.address,
        outdatedTokenRoots: [],
        tokenRoot: tokenRoot.address,
        settingsDeployWalletGrams: locklift.utils.toNano(0.1)
    }

    await proxy.methods.setConfiguration({
        _config: proxyConfiguration,
        gasBackAddress: owner.address
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
    });


    const initializer = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3, // or WalletTypes.HighLoadWallet,
        //Value which will send to the new account from a giver
        value: locklift.utils.toNano(10),
        //owner publicKey
        publicKey: signer.publicKey,
    });

    await logContract("initializer address", initializer.account.address);

    return [solanaEverscaleEventConfiguration, everscaleSolanaEventConfiguration, proxy, initializer.account];
};

const setupTokenRootWithWallet = async (rootOwner: Address, mintAmount: number, decimals = 9) => {
    const signer = (await locklift.keystore.getSigner("2"))!;

    const tokenWallet = await locklift.factory.getContractArtifacts('TokenWallet');

    const {contract: root} = await locklift.factory.deployContract({
        contract: 'TokenRoot',
        constructorParams: {
            initialSupplyTo: rootOwner,
            initialSupply: mintAmount,
            deployWalletValue: locklift.utils.toNano(0.1),
            mintDisabled: false,
            burnByRootDisabled: false,
            burnPaused: false,
            remainingGasTo: zeroAddress
        },
        initParams: {
            deployer_: zeroAddress,
            randomNonce_: locklift.utils.getRandomNonce(),
            rootOwner_: rootOwner,
            name_: Buffer.from('Token').toString('hex'),
            symbol_: Buffer.from('TKN').toString('hex'),
            decimals_: decimals,
            walletCode_: tokenWallet.code,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(2)
    });

    await logContract("root address", root.address);

    return root;
}

const setupEverscaleEthereumEventConfiguration = async (owner: Account, staking: Contract<FactorySource["StakingMockup"]>) => {
    const signer = (await locklift.keystore.getSigner("2"))!;

    const _randomNonce = locklift.utils.getRandomNonce();

    const proxyData = await locklift.factory.getContractArtifacts('ProxyTokenTransfer');

    const proxyFutureAddress = await locklift.provider.getExpectedAddress(
        proxyData.abi,
        {
            tvc: proxyData.tvc,
            initParams: {
                _randomNonce,
            },
            publicKey: signer.publicKey,
            workchain: 0
        });

    const initializer = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3, // or WalletTypes.HighLoadWallet,
        //Value which will send to the new account from a giver
        value: locklift.utils.toNano(10),
        //owner publicKey
        publicKey: signer.publicKey,
    });

    await logContract("initializer address", initializer.account.address);

    let tokenRoot: Contract<FactorySource["TokenRoot"]> = await setupTokenRootWithWallet(
        initializer.account.address,
        parseInt(locklift.utils.toNano('1000'), 10)
    );

    await tokenRoot.methods.transferOwnership({
        newOwner: proxyFutureAddress,
        remainingGasTo: initializer.account.address,
        callbacks: []
    }).send({
        from: initializer.account.address,
        amount: locklift.utils.toNano(1),
    });

    const everscaleEventData = await locklift.factory.getContractArtifacts('TokenTransferEverscaleEthereumEvent');

    const configurationMeta = '';
    const {contract: everscaleEthereumEventConfiguration} = await locklift.factory.deployContract({
        contract: 'EverscaleEthereumEventConfiguration',
        constructorParams: {
            _owner: owner.address,
            _meta: configurationMeta,
        },
        initParams: {
            basicConfiguration: {
                eventABI: '',
                eventInitialBalance: locklift.utils.toNano(2),
                staking: staking.address,
                eventCode: everscaleEventData.code,
            },
            networkConfiguration: {
                eventEmitter: proxyFutureAddress,
                proxy: new BigNumber(0),
                startTimestamp: 0,
                endTimestamp: 0,
            }
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("everscaleEthereumEventConfiguration address", everscaleEthereumEventConfiguration.address);


    const {contract: proxy} = await locklift.factory.deployContract({
        contract: 'ProxyTokenTransfer',
        constructorParams: {
            owner_: owner.address,
        },
        initParams: {
            _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("ProxyTokenTransfer address" , proxy.address);

    const proxyConfiguration = {
        everscaleEthereumConfiguration: everscaleEthereumEventConfiguration.address,
        ethereumEverscaleConfigurations: [],
        everscaleSolanaConfiguration: zeroAddress,
        solanaEverscaleConfiguration: zeroAddress,
        outdatedTokenRoots: [],
        tokenRoot: tokenRoot.address,
        settingsDeployWalletGrams: locklift.utils.toNano(0.1)
    }

    await proxy.methods.setConfiguration({
        _config: proxyConfiguration,
        gasBackAddress: owner.address
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
    });

    return [everscaleEthereumEventConfiguration, proxy, initializer];
};

const setupEverscaleSolanaEventConfiguration = async (owner: Account, staking: Contract<FactorySource["StakingMockup"]>) => {
    const signer = (await locklift.keystore.getSigner("2"))!;

    const _randomNonce = locklift.utils.getRandomNonce();

    const proxyData = await locklift.factory.getContractArtifacts('ProxyTokenTransfer');

    const proxyFutureAddress = await locklift.provider.getExpectedAddress(
        proxyData.abi,
        {
            tvc: proxyData.tvc,
            initParams: {
                _randomNonce,
            },
            publicKey: signer.publicKey,
            workchain: 0
        });

    const initializer = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3, // or WalletTypes.HighLoadWallet,
        //Value which will send to the new account from a giver
        value: locklift.utils.toNano(10),
        //owner publicKey
        publicKey: signer.publicKey,
    });

    await logContract("initializer address", initializer.account.address);
    
    const tokenRoot = await setupTokenRootWithWallet(
        initializer.account.address,
        parseInt(locklift.utils.toNano('1000'), 10)
    );

    await tokenRoot.methods.transferOwnership({
        newOwner: proxyFutureAddress,
        remainingGasTo: initializer.account.address,
        callbacks: []
    }).send({
        from: initializer.account.address,
        amount: locklift.utils.toNano(1),
    });

    const everscaleSolanaEventConfigurationData = await locklift.factory.getContractArtifacts('EverscaleSolanaEventConfiguration');

    const {contract: everFactory} = await locklift.factory.deployContract({
        contract: 'EverscaleSolanaEventConfigurationFactory',
        constructorParams: {
            _configurationCode: everscaleSolanaEventConfigurationData.code
        },
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce(),
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("EverscaleSolanaEventConfigurationFactory address", everFactory.address);

    const everEventData = await locklift.factory.getContractArtifacts('TokenTransferEverscaleSolanaEvent');

    const everBasicConfiguration = {
        eventABI: '',
        eventInitialBalance: locklift.utils.toNano(2),
        staking: staking.address,
        eventCode: everEventData.code,
    };

    const everNetworkConfiguration = {
        program: new BigNumber(0).toFixed(),
        settings: new BigNumber(0).toFixed(),
        eventEmitter: proxyFutureAddress,
        instruction: 0,
        executeInstruction: 0,
        executeNeeded: false,
        startTimestamp: 0,
        endTimestamp: 1672365744,
    };

    await everFactory.methods.deploy({
        _owner: owner.address,
        basicConfiguration: everBasicConfiguration,
        networkConfiguration: everNetworkConfiguration,
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
    });

    let everscaleSolanaEventConfigurationAddress = await everFactory.methods.deriveConfigurationAddress({
        basicConfiguration: everBasicConfiguration,
        networkConfiguration: everNetworkConfiguration
    }).call();

    const everscaleSolanaEventConfiguration = locklift.factory.getDeployedContract(
        "EverscaleSolanaEventConfiguration",
        everscaleSolanaEventConfigurationAddress.value0,
    );

    await logContract("everscaleSolanaEventConfiguration address", everscaleSolanaEventConfiguration.address);

    const {contract: proxy} = await locklift.factory.deployContract({
        contract: 'ProxyTokenTransfer',
        constructorParams: {
            owner_: owner.address,
        },
        initParams: {
            _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("ProxyTokenTransfer address" , proxy.address);

    const proxyConfiguration = {
        everscaleEthereumConfiguration: zeroAddress,
        ethereumEverscaleConfigurations: [zeroAddress],
        everscaleSolanaConfiguration: everscaleSolanaEventConfiguration.address,
        solanaEverscaleConfiguration: zeroAddress,
        outdatedTokenRoots: [],
        tokenRoot: tokenRoot.address,
        settingsDeployWalletGrams: locklift.utils.toNano(0.1)
    }

    await proxy.methods.setConfiguration({
        _config: proxyConfiguration,
        gasBackAddress: owner.address
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
    });

    return [everscaleSolanaEventConfiguration, proxy, initializer];
};

const setupEthereumAlienMultiVault = async (owner: Account, staking: Contract<FactorySource["StakingMockup"]>) => {
    const _randomNonce = locklift.utils.getRandomNonce();
    const signer = (await locklift.keystore.getSigner("2"))!;

    // Deploy initializer account
    const initializer = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3, // or WalletTypes.HighLoadWallet,
        //Value which will send to the new account from a giver
        value: locklift.utils.toNano(10),
        //owner publicKey
        publicKey: signer.publicKey,
    });

    await logContract("initializer address", initializer.account.address);

    // Deploy proxy
    const {contract: proxy} = await locklift.factory.deployContract({
        contract: 'ProxyMultiVaultEthereumAlien',
        constructorParams: {
            owner_: owner.address,
        },
        initParams: {
            _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("ProxyMultiVaultEthereumAlien address" , proxy.address);

    // Deploy EVM configuration
    const ethereumEventData = await locklift.factory.getContractArtifacts('MultiVaultEVMEverscaleEventAlien');

    const {contract: evmEventConfiguration} = await locklift.factory.deployContract({
        contract: 'EthereumEverscaleEventConfiguration',
        constructorParams: {
            _owner: owner.address,
            _meta: '',
        },
        initParams: {
            basicConfiguration: {
                eventABI: '',
                eventInitialBalance: locklift.utils.toNano('2'),
                staking: staking.address,
                eventCode: ethereumEventData.code,
            },
            networkConfiguration: {
                chainId: 1,
                eventEmitter: new BigNumber(0),
                eventBlocksToConfirm: 1,
                proxy: proxy.address,
                startBlockNumber: 0,
                endBlockNumber: 0,
            }
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("evmEventConfiguration address" , evmEventConfiguration.address);

    // Deploy Everscale configuration
    const everscaleEventData = await locklift.factory.getContractArtifacts('MultiVaultEverscaleEVMEventAlien');

    const {contract: everscaleEthereumEventConfiguration}  = await locklift.factory.deployContract({
        contract: 'EverscaleEthereumEventConfiguration',
        constructorParams: {
            _owner: owner.address,
            _meta: '',
        },
        initParams: {
            basicConfiguration: {
                eventABI: '',
                eventInitialBalance: locklift.utils.toNano(2),
                staking: staking.address,
                eventCode: everscaleEventData.code,
            },
            networkConfiguration: {
                eventEmitter: proxy.address,
                proxy: new BigNumber(0),
                startTimestamp: 0,
                endTimestamp: 0,
            }
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("everscaleEthereumEventConfiguration address" , everscaleEthereumEventConfiguration.address);

    // Set proxy configuration
    const alienTokenRootData = await locklift.factory.getContractArtifacts('TokenRootAlienEVMEverscale');
    const alienTokenWalletUpgradeableData = await locklift.factory.getContractArtifacts('AlienTokenWalletUpgradeable');
    const alienTokenWalletPlatformData = await locklift.factory.getContractArtifacts('AlienTokenWalletPlatform');


    await proxy.methods.setConfiguration({
        _config: {
            everscaleConfiguration: everscaleEthereumEventConfiguration.address,
            evmConfigurations: [evmEventConfiguration.address],
            deployWalletValue: locklift.utils.toNano(1),
            alienTokenRootCode: alienTokenRootData.code,
            alienTokenWalletCode: alienTokenWalletUpgradeableData.code,
            alienTokenWalletPlatformCode: alienTokenWalletPlatformData.code,
        },
        remainingGasTo: owner.address
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
    });

    return [evmEventConfiguration, everscaleEthereumEventConfiguration, proxy, initializer];
};


const setupEthereumNativeMultiVault = async (owner: Account, staking: Contract<FactorySource["StakingMockup"]>) => {
    const _randomNonce = locklift.utils.getRandomNonce();
    const signer = (await locklift.keystore.getSigner("2"))!;

    // Deploy initializer account
    const initializer = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3, // or WalletTypes.HighLoadWallet,
        //Value which will send to the new account from a giver
        value: locklift.utils.toNano(10),
        //owner publicKey
        publicKey: signer.publicKey,
    });

    await logContract("initializer address", initializer.account.address);

    // Deploy proxy
    const {contract: proxy} = await locklift.factory.deployContract({
        contract: 'ProxyMultiVaultEthereumNative',
        constructorParams: {
            owner_: owner.address,
        },
        initParams: {
            _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("ProxyMultiVaultEthereumNative address" , proxy.address);

    // Deploy EVM configuration
    const EthereumEvent = await locklift.factory.getContractArtifacts('MultiVaultEVMEverscaleEventNative');

    const {contract: evmEventConfiguration}  = await locklift.factory.deployContract({
        contract: 'EthereumEverscaleEventConfiguration',
        constructorParams: {
            _owner: owner.address,
            _meta: '',
        },
        initParams: {
            basicConfiguration: {
                eventABI: '',
                eventInitialBalance: locklift.utils.toNano('2'),
                staking: staking.address,
                eventCode: EthereumEvent.code,
            },
            networkConfiguration: {
                chainId: 1,
                eventEmitter: new BigNumber(0),
                eventBlocksToConfirm: 1,
                proxy: proxy.address,
                startBlockNumber: 0,
                endBlockNumber: 0,
            }
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("evmEventConfiguration address" , evmEventConfiguration.address);

    // Deploy Everscale configuration
    const EverscaleEvent = await locklift.factory.getContractArtifacts('MultiVaultEverscaleEVMEventNative');

    const {contract: everscaleEthereumEventConfiguration}  = await locklift.factory.deployContract({
        contract: 'EverscaleEthereumEventConfiguration',
        constructorParams: {
            _owner: owner.address,
            _meta: '',
        },
        initParams: {
            basicConfiguration: {
                eventABI: '',
                eventInitialBalance: locklift.utils.toNano('2'),
                staking: staking.address,
                eventCode: EverscaleEvent.code,
            },
            networkConfiguration: {
                eventEmitter: proxy.address,
                proxy: new BigNumber(0),
                startTimestamp: 0,
                endTimestamp: 0,
            }
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("everscaleEthereumEventConfiguration address" , everscaleEthereumEventConfiguration.address);

    // Set proxy configuration
    await proxy.methods.setConfiguration({
        _config: {
            everscaleConfiguration: everscaleEthereumEventConfiguration.address,
            evmConfigurations: [evmEventConfiguration.address],
            deployWalletValue: locklift.utils.toNano(1),
        },
        remainingGasTo: owner.address
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
    });

    return [evmEventConfiguration, everscaleEthereumEventConfiguration, proxy, initializer];
};

const setupSolanaAlienMultiVault = async (owner: Account, staking: Contract<FactorySource["StakingMockup"]>) => {
    const _randomNonce = locklift.utils.getRandomNonce();
    const signer = (await locklift.keystore.getSigner("2"))!;

    // Deploy initializer account
    const initializer = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3, // or WalletTypes.HighLoadWallet,
        //Value which will send to the new account from a giver
        value: locklift.utils.toNano(10),
        //owner publicKey
        publicKey: signer.publicKey,
    });

    await logContract("initializer address", initializer.account.address);

    // Deploy proxy
    const {contract: proxy} = await locklift.factory.deployContract({
        contract: 'ProxyMultiVaultSolanaAlien',
        constructorParams: {
            owner_: owner.address,
        },
        initParams: {
            _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("ProxyTokenTransfer address" , proxy.address);

    // Deploy Solana configuration
    const SolanaEvent = await locklift.factory.getContractArtifacts('MultiVaultSolanaEverscaleEventAlien');

    const {contract: solanaEventConfiguration}  = await locklift.factory.deployContract({
        contract: 'SolanaEverscaleEventConfiguration',
        constructorParams: {
            _owner: owner.address,
            _meta: '',
        },
        initParams: {
            basicConfiguration: {
                eventABI: '',
                eventInitialBalance: locklift.utils.toNano('2'),
                staking: staking.address,
                eventCode: SolanaEvent.code,
            },
            networkConfiguration: {
                program: new BigNumber(0),
                settings: new BigNumber(0),
                proxy: proxy.address,
                startTimestamp: 0,
                endTimestamp: 0,
            }
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("solanaEventConfiguration address" , solanaEventConfiguration.address);

    // Deploy Everscale configuration
    const EverscaleEvent = await locklift.factory.getContractArtifacts('MultiVaultEverscaleSolanaEventAlien');

    const {contract: everscaleSolanaEventConfiguration}  = await locklift.factory.deployContract({
        contract: 'EverscaleSolanaEventConfiguration',
        constructorParams: {
            _owner: owner.address,
            _meta: '',
        },
        initParams: {
            basicConfiguration: {
                eventABI: '',
                eventInitialBalance: locklift.utils.toNano('2'),
                staking: staking.address,
                eventCode: EverscaleEvent.code,
            },
            networkConfiguration: {
                program: new BigNumber(0),
                settings: new BigNumber(0),
                eventEmitter: proxy.address,
                instruction: 0,
                executeInstruction: 0,
                executeNeeded: false,
                startTimestamp: 0,
                endTimestamp: 0,
            }
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("everscaleSolanaEventConfiguration address" , everscaleSolanaEventConfiguration.address);

    // Set proxy configuration
    const AlienTokenRoot = await locklift.factory.getContractArtifacts('TokenRootAlienSolanaEverscale');
    const AlienTokenWalletUpgradeable = await locklift.factory.getContractArtifacts('AlienTokenWalletUpgradeable');
    const AlienTokenWalletPlatform = await locklift.factory.getContractArtifacts('AlienTokenWalletPlatform');

    await proxy.methods.setConfiguration({
        _config: {
            everscaleConfiguration: everscaleSolanaEventConfiguration.address,
            solanaConfiguration: solanaEventConfiguration.address,
            deployWalletValue: locklift.utils.toNano(1),
            alienTokenRootCode: AlienTokenRoot.code,
            alienTokenWalletCode: AlienTokenWalletUpgradeable.code,
            alienTokenWalletPlatformCode: AlienTokenWalletPlatform.code,
        },
        remainingGasTo: owner.address
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
    });

    return [solanaEventConfiguration, everscaleSolanaEventConfiguration, proxy, initializer];
};


const setupSolanaNativeMultiVault = async (owner: Account, staking: Contract<FactorySource["StakingMockup"]>) => {
    const _randomNonce = locklift.utils.getRandomNonce();
    const signer = (await locklift.keystore.getSigner("2"))!;

    // Deploy initializer account
    const initializer = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3, // or WalletTypes.HighLoadWallet,
        //Value which will send to the new account from a giver
        value: locklift.utils.toNano(10),
        //owner publicKey
        publicKey: signer.publicKey,
    });

    await logContract("initializer address", initializer.account.address);

    // Deploy proxy
    const {contract: proxy} = await locklift.factory.deployContract({
        contract: 'ProxyMultiVaultSolanaNative',
        constructorParams: {
            owner_: owner.address,
        },
        initParams: {
            _randomNonce,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("ProxyTokenTransfer address" , proxy.address);

    // Deploy Solana configuration
    const SolanaEvent = await locklift.factory.getContractArtifacts('MultiVaultSolanaEverscaleEventNative');

    const {contract: solanaEventConfiguration}  = await locklift.factory.deployContract({
        contract: 'SolanaEverscaleEventConfiguration',
        constructorParams: {
            _owner: owner.address,
            _meta: '',
        },
        initParams: {
            basicConfiguration: {
                eventABI: '',
                eventInitialBalance: locklift.utils.toNano('2'),
                staking: staking.address,
                eventCode: SolanaEvent.code,
            },
            networkConfiguration: {
                program: new BigNumber(0),
                settings: new BigNumber(0),
                proxy: proxy.address,
                startTimestamp: 0,
                endTimestamp: 0,
            }
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("solanaEventConfiguration address" , solanaEventConfiguration.address);

    // Deploy Everscale configuration
    const EverscaleEvent = await locklift.factory.getContractArtifacts('MultiVaultEverscaleSolanaEventNative');

    const {contract: everscaleSolanaEventConfiguration}  = await locklift.factory.deployContract({
        contract: 'EverscaleSolanaEventConfiguration',
        constructorParams: {
            _owner: owner.address,
            _meta: '',
        },
        initParams: {
            basicConfiguration: {
                eventABI: '',
                eventInitialBalance: locklift.utils.toNano('2'),
                staking: staking.address,
                eventCode: EverscaleEvent.code,
            },
            networkConfiguration: {
                program: new BigNumber(0),
                settings: new BigNumber(0),
                eventEmitter: proxy.address,
                instruction: 0,
                executeInstruction: 0,
                executeNeeded: false,
                startTimestamp: 0,
                endTimestamp: 0,
            }
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    await logContract("everscaleSolanaEventConfiguration address" , everscaleSolanaEventConfiguration.address);

    await proxy.methods.setConfiguration({
        _config: {
            everscaleConfiguration: everscaleSolanaEventConfiguration.address,
            solanaConfiguration: solanaEventConfiguration.address,
            deployWalletValue: locklift.utils.toNano(1),
        },
        remainingGasTo: owner.address
    }).send({
        from: owner.address,
        amount: locklift.utils.toNano(0.5),
    });

    return [solanaEventConfiguration, everscaleSolanaEventConfiguration, proxy, initializer];
};


const getTokenWalletByAddress = async (walletOwner: Address, rootAddress: Address) => {
    const tokenRoot = await locklift.factory.getDeployedContract('TokenRoot', rootAddress);

    const walletAddress = await tokenRoot.methods.walletOf({
            answerId: 0,
            walletOwner: walletOwner
    }).call();

    const tokenWallet = await locklift.factory.getDeployedContract('TokenWallet', walletAddress.value0);

    return tokenWallet;
}

const getTokenRoot = async (rootAddress: Address) => {
    const tokenRoot = await locklift.factory.getDeployedContract('TokenRoot', rootAddress);

    return tokenRoot;
}

const setupRelays = async (amount = 20) => {
    return Promise.all(_
        .range(amount)
        .map(async () => ed25519_generateKeyPair())
    );
};

const enableEventConfiguration = async (bridgeOwner: Account, bridge: Contract<FactorySource["Bridge"]>, eventConfiguration: Address) => {

    const connectorId = await bridge.methods.connectorCounter().call();
    const connectorDeployValue = await bridge.methods.connectorDeployValue().call();

    await bridge.methods.deployConnector({
        _eventConfiguration: eventConfiguration
    }).send({
        from: bridgeOwner.address,
        amount: (parseInt(connectorDeployValue.connectorDeployValue, 10) + 1000000000).toString(),
    });

    const connectorAddress = await bridge.methods.deriveConnectorAddress({
        id: connectorId.connectorCounter
    }).call();

    const connector = await locklift.factory.getDeployedContract('Connector', connectorAddress.connector);

    await connector.methods.enable().send({
        from: bridgeOwner.address,
        amount: locklift.utils.toNano(0.5),
    });
};


const captureConnectors = async (bridge: Contract<FactorySource["Bridge"]>) => {

    const connectorCounter = await bridge.methods.connectorCounter().call();

    const configurations = await Promise.all(_.range(parseInt(connectorCounter.connectorCounter, 10)).map(async (connectorId: number) => {

        const connectorAddress = await bridge.methods.deriveConnectorAddress({
            id: connectorId
        }).call();

        const connector = await locklift.factory.getDeployedContract('Connector', connectorAddress.connector);

        return await connector.methods.getDetails({}).call();
    }));

    return configurations.reduce((acc, configuration) => {
        return {
            ...acc,
            [configuration._id]: configuration
        }
    }, {});
};

const deployTokenRoot = async function (token_name: string, token_symbol: string, owner: Account) {
    const signer = (await locklift.keystore.getSigner("2"))!;

    const TokenWallet = await locklift.factory.getContractArtifacts('TokenWallet');

    const {contract: _root}  = await locklift.factory.deployContract({
        contract: 'TokenRoot',
        constructorParams: {
            initialSupplyTo: zeroAddress,
            initialSupply: 0,
            deployWalletValue: 0,
            mintDisabled: false,
            burnByRootDisabled: false,
            burnPaused: false,
            remainingGasTo: owner.address
        },
        initParams: {
            name_: token_name,
            symbol_: token_symbol,
            decimals_: 9,
            rootOwner_: owner.address,
            walletCode_: TokenWallet.code,
            randomNonce_: locklift.utils.getRandomNonce(),
            deployer_: zeroAddress
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(1)
    });

    return _root;
}

const deployTokenWallets = async function (users: Account[], _root: Contract<FactorySource["TokenRoot"]>) {
    let wallets = []
    for (const user of users) {

        await locklift.transactions.waitFinalized(_root.methods.deployWallet({
            answerId: 0,
            walletOwner: user.address,
            deployWalletValue: locklift.utils.toNano(1),
        }).send({
            from: user.address,
            amount: locklift.utils.toNano(2),
        }));

        const walletAddr = await getTokenWalletAddr(_root, user);

        logger.log(`User token wallet: ${walletAddr}`);

        let userTokenWallet = await locklift.factory.getDeployedContract(
            'TokenWallet',
            walletAddr.value0
        );

        wallets.push(userTokenWallet);
    }
    return wallets;
}

const sendTokens = async function (user: Account, _userTokenWallet: Contract<FactorySource["TokenWallet"]>, recipient: Account, amount: number, payload: any) {
    return await _userTokenWallet.methods.transfer({
        amount: amount,
        recipient: recipient.address,
        deployWalletValue: 0,
        remainingGasTo: user.address,
        notify: true,
        payload: payload
    }).send({
        from: user.address,
        amount: locklift.utils.toNano(11),
    });
};

const depositTokens = async function (stakingRoot: Account, user: Account, _userTokenWallet: Contract<FactorySource["TokenWallet"]>, depositAmount: number, reward = false) {
    var payload;
    const DEPOSIT_PAYLOAD = 'te6ccgEBAQEAAwAAAgA=';
    const REWARD_DEPOSIT_PAYLOAD = 'te6ccgEBAQEAAwAAAgE=';
    if (reward) {
        payload = REWARD_DEPOSIT_PAYLOAD;
    } else {
        payload = DEPOSIT_PAYLOAD;
    }

    return await sendTokens(user, _userTokenWallet, stakingRoot, depositAmount, payload);
};

// mint + deploy
const mintTokens = async function (owner: Account, users: Account[], _root: Contract<FactorySource["TokenRoot"]>, mint_amount: number) {
    let wallets = [];
    for (const user of users) {
        await locklift.transactions.waitFinalized(_root.methods.mint({
            amount: mint_amount,
            recipient: user.address,
            deployWalletValue: locklift.utils.toNano(1),
            remainingGasTo: owner.address,
            notify: false,
            payload: ''
        }).send({
            from: owner.address,
            amount: locklift.utils.toNano(3),
        }));

        const walletAddr = await getTokenWalletAddr(_root, user);

        logger.log(`User token wallet: ${walletAddr}`);

        let userTokenWallet = await locklift.factory.getDeployedContract(
            'TokenWallet',
            walletAddr.value0
        );

        wallets.push(userTokenWallet);
    }
    return wallets;
}

const deployAccount = async function (signer: Signer, value: number) {
    const account = await locklift.transactions.waitFinalized(locklift.factory.accounts.addNewAccount({
        type: WalletTypes.MsigAccount,
        contract: "Wallet",
        value: locklift.utils.toNano(value),
        publicKey: signer.publicKey,
        constructorParams: {},
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce(),
        },
    }));

    return account.account;
}

const getTokenWalletAddr = async function (_root: Contract<FactorySource["TokenRoot"]>, user: Account) {
    return await _root.methods.walletOf({answerId: 0, walletOwner: user.address}).call();
}


const isValidTonAddress = (address: string) => /^(?:-1|0):[0-9a-fA-F]{64}$/.test(address);


const stringToBytesArray = (dataString: string) => {
    return Buffer.from(dataString).toString('hex')
};


module.exports = {
    setupBridge,
    setupEthereumEverscaleEventConfiguration,
    setupSolanaEverscaleEventConfiguration,
    setupEverscaleEthereumEventConfiguration,
    setupEverscaleSolanaEventConfiguration,
    setupSolanaEverscaleEventConfigurationReal,
    setupTokenRootWithWallet,
    setupRelays,
    setupEthereumAlienMultiVault,
    setupEthereumNativeMultiVault,
    setupSolanaAlienMultiVault,
    setupSolanaNativeMultiVault,
    logContract,
    MetricManager,
    enableEventConfiguration,
    captureConnectors,
    getTokenRoot,
    getTokenWalletByAddress,
    sendTokens,
    isValidTonAddress,
    deployTokenRoot,
    deployTokenWallets,
    depositTokens,
    stringToBytesArray,
    getTokenWalletAddr,
    mintTokens,
    deployAccount,
    logger,
};
