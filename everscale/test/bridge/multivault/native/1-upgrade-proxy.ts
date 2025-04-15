import {Account} from "everscale-standalone-client/nodejs";
import {deployAccount} from "../../../utils/account";
import {Address, Contract, zeroAddress} from "locklift";
import {
    ProxyMultiVaultNative_V1Abi,
    ProxyMultiVaultNative_V2_Fix_UpgradeAbi,
    ProxyMultiVaultNative_V2Abi,
    ProxyMultiVaultNative_V3Abi,
    ProxyMultiVaultNative_V4Abi,
    ProxyMultiVaultNative_V5Abi,
    ProxyMultiVaultNative_V6Abi,
    ProxyMultiVaultNative_V7Abi
} from "../../../../build/factorySource";
import {expect} from "chai";

let owner: Account;
let proxy_v1: Contract<ProxyMultiVaultNative_V1Abi>;
let proxy_v2: Contract<ProxyMultiVaultNative_V2Abi>;
let proxy_v2_fix: Contract<ProxyMultiVaultNative_V2_Fix_UpgradeAbi>;
let proxy_v3: Contract<ProxyMultiVaultNative_V3Abi>;
let proxy_v4: Contract<ProxyMultiVaultNative_V4Abi>;
let proxy_v5: Contract<ProxyMultiVaultNative_V5Abi>;
let proxy_v6: Contract<ProxyMultiVaultNative_V6Abi>;
let proxy_v7: Contract<ProxyMultiVaultNative_V7Abi>;

let _configuration: any;
let _owner: Address;


describe('Test Native proxy upgrade', async function () {
    this.timeout(10000000);

    it('Setup proxy V1', async () => {
        const signer = (await locklift.keystore.getSigner("0"))!;

        owner = await deployAccount(signer, 30);

        const {
            contract
        } = await locklift.factory.deployContract({
            contract: "ProxyMultiVaultNative_V1",
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
        await proxy_v1.methods.setConfiguration({
            _config: {
                everscaleConfiguration: owner.address,
                evmConfigurations: [zeroAddress, owner.address],
                deployWalletValue: locklift.utils.toNano(0.2),
            },
            remainingGasTo: owner.address
        }).send({
            from: owner.address,
            amount: locklift.utils.toNano(1)
        })
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
                .owner()
                .call()
                .then(t => t.owner);
        });

        it('Upgrade', async () => {
            const ProxyMultiVaultNative_V2 = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultNative_V2"
            );

            await proxy_v1.methods
                .upgrade({
                    code: ProxyMultiVaultNative_V2.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                });

            proxy_v2 = locklift.factory.getDeployedContract(
                "ProxyMultiVaultNative_V2",
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
        });

        it('Check owner', async () => {
            const {
                owner
            } = await proxy_v2.methods.owner().call();

            expect(owner.toString())
                .to.be.equal(_owner.toString(), 'Wrong owner after upgrade')
        });
    });

    describe('Update proxy to V2 fix', async () => {
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
            const ProxyMultiVaultNative_V2_Fix_Upgrade = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultNative_V2_Fix_Upgrade"
            );

            await proxy_v2.methods
                .upgrade({
                    code: ProxyMultiVaultNative_V2_Fix_Upgrade.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                });

            proxy_v2_fix = locklift.factory.getDeployedContract(
                "ProxyMultiVaultNative_V2_Fix_Upgrade",
                proxy_v1.address
            );
        });

        it('Check API version', async () => {
            const api_version = await proxy_v2_fix
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
            } = await proxy_v2_fix.methods.owner().call();

            expect(owner.toString())
                .to.be.equal(_owner.toString(), 'Wrong owner after upgrade')
        });
    });

    describe('Update proxy to V3', async () => {
        it('Save state', async () => {
            _configuration = await proxy_v2_fix
                .methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true })
                .then(t => t.value0);

            _owner = await proxy_v2_fix
                .methods
                .owner().call().then(t => t.owner);
        });

        it('Upgrade', async () => {
            const ProxyMultiVaultNative_V3 = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultNative_V3"
            );

            await locklift.tracing.trace(proxy_v2_fix.methods
                .upgrade({
                    code: ProxyMultiVaultNative_V3.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                }));

            proxy_v3 = locklift.factory.getDeployedContract(
                "ProxyMultiVaultNative_V3",
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
                "4",
                "Wrong api version"
            );
        });

        it('Check state', async () => {
            const {
                value0: evmConfiguration,
                value1: solanaConfiguration
            } = await proxy_v3.methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true });

            expect(evmConfiguration.everscaleConfiguration.toString())
                .to.be.equal(_configuration.everscaleConfiguration.toString(), 'Wrong Everscale-EVM configuration');
            expect(evmConfiguration.evmConfigurations.map(t => t.toString()))
                .to.be.eql(_configuration.evmConfigurations.map((t: Address) => t.toString()), 'Wrong EVM-Everscale configurations');
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
            const ProxyMultiVaultNative_V4 = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultNative_V4"
            );

            await locklift.tracing.trace(proxy_v3.methods
                .upgrade({
                    code: ProxyMultiVaultNative_V4.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                }));

            proxy_v4 = locklift.factory.getDeployedContract(
                "ProxyMultiVaultNative_V4",
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
                "5",
                "Wrong api version"
            );
        });

        it('Check state', async () => {
            const {
                value0: evmConfiguration,
                value1: solanaConfiguration
            } = await proxy_v4.methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true });

            expect(evmConfiguration.everscaleConfiguration.toString())
                .to.be.equal(_configuration.everscaleConfiguration.toString(), 'Wrong Everscale-EVM configuration');
            expect(evmConfiguration.evmConfigurations.map(t => t.toString()))
                .to.be.eql(_configuration.evmConfigurations.map((t: Address) => t.toString()), 'Wrong EVM-Everscale configurations');
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
            const ProxyMultiVaultNative_V5 = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultNative_V5"
            );

            await locklift.tracing.trace(proxy_v4.methods
                .upgrade({
                    code: ProxyMultiVaultNative_V5.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                }));

            proxy_v5 = locklift.factory.getDeployedContract(
                "ProxyMultiVaultNative_V5",
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
                "6",
                "Wrong api version"
            );
        });

        it('Check state', async () => {
            const {
                value0: evmConfiguration,
                value1: solanaConfiguration
            } = await proxy_v5.methods
                .getConfiguration({ answerId: 0 })
                .call({ responsible: true });

            expect(evmConfiguration.everscaleConfiguration.toString())
                .to.be.equal(_configuration.everscaleConfiguration.toString(), 'Wrong Everscale-EVM configuration');
            expect(evmConfiguration.evmConfigurations.map(t => t.toString()))
                .to.be.eql(_configuration.evmConfigurations.map((t: Address) => t.toString()), 'Wrong EVM-Everscale configurations');
        });

        it('Check owner', async () => {
            const {
                owner
            } = await proxy_v5.methods.owner().call();

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
            const ProxyMultiVaultNative_V6 = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultNative_V6"
            );

            await locklift.tracing.trace(proxy_v5.methods
                .upgrade({
                    code: ProxyMultiVaultNative_V6.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                }));

            proxy_v6 = locklift.factory.getDeployedContract(
                "ProxyMultiVaultNative_V6",
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
                "7",
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
        });

        it('Check owner', async () => {
            const { owner } = await proxy_v6.methods.owner().call();

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
            const ProxyMultiVaultNative_V7 = locklift.factory.getContractArtifacts(
                "ProxyMultiVaultNative_V7"
            );

            await locklift.tracing.trace(proxy_v6.methods
                .upgrade({
                    code: ProxyMultiVaultNative_V7.code
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(1)
                }));

            proxy_v7 = locklift.factory.getDeployedContract(
                "ProxyMultiVaultNative_V7",
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
                "8",
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
        });

        it('Check owner', async () => {
            const { owner } = await proxy_v6.methods.owner().call();

            expect(owner.toString())
                .to.be.equal(_owner.toString(), 'Wrong owner after upgrade')
        });
    });
});
