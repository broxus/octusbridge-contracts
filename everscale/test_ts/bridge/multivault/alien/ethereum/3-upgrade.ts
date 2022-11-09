import {Ed25519KeyPair} from "nekoton-wasm";

const {
    setupRelays,
    setupBridge,
    setupEthereumAlienMultiVault,
    logger
} = require("../../../../utils");

import { Contract } from "locklift";
import { FactorySource } from "../../../../../build/factorySource";
import {Account} from "everscale-standalone-client/nodejs";
import { expect } from "chai";

let bridge: Contract<FactorySource["Bridge"]>;
let cellEncoder: Contract<FactorySource["CellEncoderStandalone"]>;
let staking: Contract<FactorySource["StakingMockup"]>;
let bridgeOwner: Account;
let relays: Ed25519KeyPair[];
let evmConfiguration: Contract<FactorySource["EthereumEverscaleEventConfiguration"]>;
let everscaleConfiguration: Contract<FactorySource["EverscaleEthereumEventConfiguration"]>;
let proxy: Contract<FactorySource["ProxyMultiVaultEthereumAlien"]>;
let initializer: Account;

describe('Test Alien proxy upgrade', async function() {
    this.timeout(10000000);

    it('Setup bridge', async () => {
        relays = await setupRelays();
        [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

        [evmConfiguration, everscaleConfiguration, proxy, initializer] = await setupEthereumAlienMultiVault(
            bridgeOwner,
            staking,
            cellEncoder
        );
    });

    it('Check initial api version', async () => {
        expect(await proxy.methods.apiVersion({answerId: 0}).call())
            .to.be.equal(1, 'Wrong api version');
    });

    it('Upgrade proxy to itself and check storage', async () => {
        const _configuration = await proxy.methods.getConfiguration({answerId: 0}).call().then(c => c.value0);

        const Proxy = await locklift.factory.getContractArtifacts('ProxyMultiVaultEthereumAlien');

        const tx = await proxy.methods.upgrade({
            code: Proxy.code
        }).send({
            from: bridgeOwner.address,
            amount: locklift.utils.toNano(10),
        });

        logger.log(`Upgrade tx: ${tx.id}`);

        const configuration = await proxy.methods.getConfiguration({answerId: 0}).call().then(c => c.value0);

        expect(configuration.everscaleConfiguration)
            .to.be.equal(_configuration.everscaleConfiguration, 'Wrong everscale configuration');
        expect(configuration.evmConfigurations)
            .to.be.eql(_configuration.evmConfigurations, 'Wrong evm configurations');
        expect(configuration.deployWalletValue)
            .to.be.equal(_configuration.deployWalletValue, 'Wrong deploy wallet value');

        expect(configuration.alienTokenRootCode)
            .to.be.equal(_configuration.alienTokenRootCode, 'Wrong alien token root code');
        expect(configuration.alienTokenWalletCode)
            .to.be.equal(_configuration.alienTokenWalletCode, 'Wrong alien token wallet code');
        expect(configuration.alienTokenWalletPlatformCode)
            .to.be.equal(_configuration.alienTokenWalletPlatformCode, 'Wrong alien token wallet platform code');
    });

    it('Check api version after upgrade', async () => {
        expect(await proxy.methods.apiVersion({answerId: 0}).call())
            .to.be.equal(2, 'Wrong api version');
    });
});