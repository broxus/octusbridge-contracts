import {Address, Contract, zeroAddress} from "locklift";
import {
    ProxyMultiVaultAlien_V1Abi,
    ProxyMultiVaultAlien_V2Abi,
    ProxyMultiVaultAlien_V3Abi,
    ProxyMultiVaultAlien_V4Abi,
    ProxyMultiVaultAlien_V5Abi,
    ProxyMultiVaultAlien_V6Abi,
    ProxyMultiVaultAlien_V7Abi,
    ProxyMultiVaultAlien_V8Abi,
} from "../../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";
import { expect } from "chai";
import {deployAccount} from "../../../utils/account";

let owner: Account;

let proxy_v1: Contract<ProxyMultiVaultAlien_V1Abi>;
let proxy_v2: Contract<ProxyMultiVaultAlien_V2Abi>;
let proxy_v3: Contract<ProxyMultiVaultAlien_V3Abi>;
let proxy_v4: Contract<ProxyMultiVaultAlien_V4Abi>;
let proxy_v5: Contract<ProxyMultiVaultAlien_V5Abi>;
let proxy_v6: Contract<ProxyMultiVaultAlien_V6Abi>;
let proxy_v7: Contract<ProxyMultiVaultAlien_V7Abi>;
let proxy_v8: Contract<ProxyMultiVaultAlien_V8Abi>;

let _configuration: any;
let _owner: Address;


describe("Test Alien proxy upgrade", async function () {
    this.timeout(10000000);

    it('Setup proxy V1', async () => {
        const signer = (await locklift.keystore.getSigner("0"))!;

        owner = await deployAccount(signer, 30);

        const {
            contract
        } = await locklift.factory.deployContract({
            contract: "ProxyMultiVaultAlien_V1",
            constructorParams: {
                owner_: owner.address,
            },
            initParams: {
                _randomNonce: locklift.utils.getRandomNonce()
            },
            publicKey: signer.publicKey,
            value: locklift.utils.toNano(20),
        });

        proxy_v1 = contract;
    });

    it('Set dummy configuration', async () => {
        const alienTokenRootEVM = locklift.factory.getContractArtifacts(
            "TokenRootAlienEVM"
        );
        const alienTokenWalletUpgradeableData =
            locklift.factory.getContractArtifacts("AlienTokenWalletUpgradeable");
        const alienTokenWalletPlatformData =
            locklift.factory.getContractArtifacts("AlienTokenWalletPlatform");

        await proxy_v1.methods
            .setConfiguration({
                _config: {
                    everscaleConfiguration: owner.address,
                    evmConfigurations: [zeroAddress, owner.address],
                    deployWalletValue: locklift.utils.toNano(0.2),
                    alienTokenRootCode: alienTokenRootEVM.code,
                    alienTokenWalletCode: alienTokenWalletUpgradeableData.code,
                    alienTokenWalletPlatformCode: alienTokenWalletPlatformData.code,
                },
                remainingGasTo: owner.address
            })
            .send({
                from: owner.address,
                amount: locklift.utils.toNano(1),
            });
    });

    it('Check api version', async () => {
        const api_version = await proxy_v1
            .methods
            .apiVersion({ answerId: 0 })
            .call({ responsible: true })
            .then(t => t.value0);

        expect(api_version).to.be.equal(
            "1",
            "Wrong api version"
        );
    });

    describe('Upgrade proxy to V2', async () => {
        it('Save state', async () => {
            _configuration = await proxy_v1
                .methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            _owner = await proxy_v1
                .methods
                .owner().call().then(t => t.owner);
        });

        it('Upgrade', async () => {
            const ProxyMultiVaultAlien_V2 = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultAlien_V2"
            );

            await proxy_v1.methods
                .upgrade({
                    code: ProxyMultiVaultAlien_V2.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                });

            proxy_v2 = locklift.factory.getDeployedContract(
                "ProxyMultiVaultAlien_V2",
                proxy_v1.address
            );
        });

        it('Check API version', async () => {
            const api_version = await proxy_v2
                .methods
                .apiVersion({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            expect(api_version).to.be.equal(
                "2",
                "Wrong api version"
            );
        });

        it('Check state', async () => {
            const configuration = await proxy_v2
                .methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            expect(configuration.everscaleConfiguration.toString())
                .to.be.eql(_configuration.everscaleConfiguration.toString(), 'Wrong everscale configuration');
            expect(configuration.evmConfigurations.map(t => t.toString()))
                .to.be.eql(_configuration.evmConfigurations.map((t: Address) => t.toString()), 'Wrong evm configurations');
            expect(configuration.deployWalletValue)
                .to.be.equal(_configuration.deployWalletValue, 'Wrong deploy wallet value');

            expect(configuration.alienTokenRootCode)
                .to.be.equal(_configuration.alienTokenRootCode, 'Wrong alien token root code');
            expect(configuration.alienTokenWalletCode)
                .to.be.equal(_configuration.alienTokenWalletCode, 'Wrong alien token wallet code');
            expect(configuration.alienTokenWalletPlatformCode)
                .to.be.equal(_configuration.alienTokenWalletPlatformCode, 'Wrong alien token wallet platform code');
        });

        it('Check owner', async () => {
            const {
                owner
            } = await proxy_v2.methods.owner().call();

            expect(owner.toString())
                .to.be.equal(_owner.toString(), 'Wrong owner after upgrade')
        });
    });

    describe('Update proxy to V3', async () => {
        it('Save state', async () => {
            _configuration = await proxy_v2
                .methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            _owner = await proxy_v2
                .methods
                .owner().call().then(t => t.owner);
        });

        it('Upgrade', async () => {
            const ProxyMultiVaultAlien_V3 = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultAlien_V3"
            );

            await proxy_v2.methods
                .upgrade({
                    code: ProxyMultiVaultAlien_V3.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                });

            proxy_v3 = locklift.factory.getDeployedContract(
                "ProxyMultiVaultAlien_V3",
                proxy_v1.address
            );
        });

        it('Check API version', async () => {
            const api_version = await proxy_v3
                .methods
                .apiVersion({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            expect(api_version).to.be.equal(
                "3",
                "Wrong api version"
            );
        });

        it('Check state', async () => {

        });

        it('Check owner', async () => {
            const {
                owner
            } = await proxy_v3.methods.owner().call();

            expect(owner.toString())
                .to.be.equal(_owner.toString(), 'Wrong owner after upgrade')
        });
    });

    describe('Update proxy to V4', async () => {
        it('Save state', async () => {
            _configuration = await proxy_v3
                .methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            _owner = await proxy_v3
                .methods
                .owner().call().then(t => t.owner);
        });

        it('Upgrade', async () => {
            const ProxyMultiVaultAlien_V4 = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultAlien_V4"
            );

            await proxy_v3.methods
                .upgrade({
                    code: ProxyMultiVaultAlien_V4.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                });

            proxy_v4 = locklift.factory.getDeployedContract(
                "ProxyMultiVaultAlien_V4",
                proxy_v1.address
            );
        });

        it('Check API version', async () => {
            const api_version = await proxy_v4
                .methods
                .apiVersion({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            expect(api_version).to.be.equal(
                "4",
                "Wrong api version"
            );
        });

        it('Check state', async () => {

        });

        it('Check owner', async () => {
            const {
                owner
            } = await proxy_v4.methods.owner().call();

            expect(owner.toString())
                .to.be.equal(_owner.toString(), 'Wrong owner after upgrade')
        });
    });

    describe('Update proxy to V5', async () => {
        it('Save state', async () => {
            _configuration = await proxy_v4
                .methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            _owner = await proxy_v4
                .methods
                .owner().call().then(t => t.owner);
        });

        it('Upgrade', async () => {
            const ProxyMultiVaultAlien_V5 = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultAlien_V5"
            );

            await proxy_v4.methods
                .upgrade({
                    code: ProxyMultiVaultAlien_V5.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                });

            proxy_v5 = locklift.factory.getDeployedContract(
                "ProxyMultiVaultAlien_V5",
                proxy_v1.address
            );
        });

        it('Check API version', async () => {
            const api_version = await proxy_v5
                .methods
                .apiVersion({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            expect(api_version).to.be.equal(
                "5",
                "Wrong api version"
            );
        });

        it('Check state', async () => {

        });

        it('Check owner', async () => {
            const {
                owner
            } = await proxy_v4.methods.owner().call();

            expect(owner.toString())
                .to.be.equal(_owner.toString(), 'Wrong owner after upgrade')
        });
    });

    describe('Update proxy to V6', async () => {
        it('Save state', async () => {
            _configuration = await proxy_v5
                .methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            _owner = await proxy_v5
                .methods
                .owner().call().then(t => t.owner);
        });

        it('Upgrade', async () => {
            const ProxyMultiVaultAlien_V6 = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultAlien_V6"
            );

            await proxy_v5.methods
                .upgrade({
                    code: ProxyMultiVaultAlien_V6.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                });

            proxy_v6 = locklift.factory.getDeployedContract(
                "ProxyMultiVaultAlien_V6",
                proxy_v1.address
            );
        });

        it('Check API version', async () => {
            const api_version = await proxy_v6
                .methods
                .apiVersion({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            expect(api_version).to.be.equal(
                "6",
                "Wrong api version"
            );
        });

        it('Check state', async () => {
            const {
                value0: evmConfiguration,
                value1: solanaConfiguration
            } = await proxy_v6.methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true });

            expect(evmConfiguration.everscaleConfiguration.toString())
                .to.be.equal(_configuration.everscaleConfiguration.toString(), 'Wrong Everscale-EVM configuration');
            expect(evmConfiguration.evmConfigurations.map(t => t.toString()))
                .to.be.eql(_configuration.evmConfigurations.map((t: Address) => t.toString()), 'Wrong EVM-Everscale configurations');

            expect(evmConfiguration.alienTokenRootCode)
                .to.be.equal(_configuration.alienTokenRootCode, 'Wrong alien token root code');
            expect(evmConfiguration.alienTokenWalletCode)
                .to.be.equal(_configuration.alienTokenWalletCode, 'Wrong alien token wallet code');
            expect(evmConfiguration.alienTokenWalletPlatformCode)
                .to.be.equal(_configuration.alienTokenWalletPlatformCode, 'Wrong alien token wallet platform code');
        });

        it('Check owner', async () => {
            const {
                owner
            } = await proxy_v4.methods.owner().call();

            expect(owner.toString())
                .to.be.equal(_owner.toString(), 'Wrong owner after upgrade')
        });
    });

    describe('Update proxy to V7', async () => {
        it('Save state', async () => {
            _configuration = await proxy_v6
                .methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            _owner = await proxy_v6
                .methods
                .owner().call().then(t => t.owner);
        });

        it('Upgrade', async () => {
            const ProxyMultiVaultAlien_V7 = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultAlien_V7"
            );

            await proxy_v6.methods
                .upgrade({
                    code: ProxyMultiVaultAlien_V7.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                });

            proxy_v7 = locklift.factory.getDeployedContract(
                "ProxyMultiVaultAlien_V7",
                proxy_v1.address
            );
        });

        it('Check API version', async () => {
            const api_version = await proxy_v7
                .methods
                .apiVersion({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            expect(api_version).to.be.equal(
                "7",
                "Wrong api version"
            );
        });

        it('Check state', async () => {
            const {
                value0: evmConfiguration,
                value1: solanaConfiguration
            } = await proxy_v7.methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true });

            expect(evmConfiguration.everscaleConfiguration.toString())
                .to.be.equal(_configuration.everscaleConfiguration.toString(), 'Wrong Everscale-EVM configuration');
            expect(evmConfiguration.evmConfigurations.map(t => t.toString()))
                .to.be.eql(_configuration.evmConfigurations.map((t: Address) => t.toString()), 'Wrong EVM-Everscale configurations');

            expect(evmConfiguration.alienTokenRootCode)
                .to.be.equal(_configuration.alienTokenRootCode, 'Wrong alien token root code');
            expect(evmConfiguration.alienTokenWalletCode)
                .to.be.equal(_configuration.alienTokenWalletCode, 'Wrong alien token wallet code');
            expect(evmConfiguration.alienTokenWalletPlatformCode)
                .to.be.equal(_configuration.alienTokenWalletPlatformCode, 'Wrong alien token wallet platform code');
        });

        it('Check owner', async () => {
            const {
                owner
            } = await proxy_v7.methods.owner().call();

            expect(owner.toString())
                .to.be.equal(_owner.toString(), 'Wrong owner after upgrade')
        });
    });
    describe('Update proxy to V8', async () => {
        it('Save state', async () => {
            _configuration = await proxy_v7
                .methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            _owner = await proxy_v6
                .methods
                .owner().call().then(t => t.owner);
        });

        it('Upgrade', async () => {
            const ProxyMultiVaultAlien_V8 = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultAlien_V8"
            );

            await proxy_v7.methods
                .upgrade({
                    code: ProxyMultiVaultAlien_V8.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                });

            proxy_v8 = locklift.factory.getDeployedContract(
                "ProxyMultiVaultAlien_V8",
                proxy_v1.address
            );
        });

        it('Check API version', async () => {
            const api_version = await proxy_v8
                .methods
                .apiVersion({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            expect(api_version).to.be.equal(
                "8",
                "Wrong api version"
            );
        });

        it('Check state', async () => {
            const {
                value0: evmConfiguration,
                value1: solanaConfiguration
            } = await proxy_v8.methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true });

            expect(evmConfiguration.everscaleConfiguration.toString())
                .to.be.equal(_configuration.everscaleConfiguration.toString(), 'Wrong Everscale-EVM configuration');
            expect(evmConfiguration.evmConfigurations.map(t => t.toString()))
                .to.be.eql(_configuration.evmConfigurations.map((t: Address) => t.toString()), 'Wrong EVM-Everscale configurations');

            expect(evmConfiguration.alienTokenRootCode)
                .to.be.equal(_configuration.alienTokenRootCode, 'Wrong alien token root code');
            expect(evmConfiguration.alienTokenWalletCode)
                .to.be.equal(_configuration.alienTokenWalletCode, 'Wrong alien token wallet code');
            expect(evmConfiguration.alienTokenWalletPlatformCode)
                .to.be.equal(_configuration.alienTokenWalletPlatformCode, 'Wrong alien token wallet platform code');
        });

        it('Check owner', async () => {
            const {
                owner
            } = await proxy_v8.methods.owner().call();

            expect(owner.toString())
                .to.be.equal(_owner.toString(), 'Wrong owner after upgrade')
        });
    });
});
