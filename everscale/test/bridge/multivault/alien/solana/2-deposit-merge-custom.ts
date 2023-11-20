import {setupBridge, setupRelays} from "../../../../utils/bridge";
import {deployAccount} from "../../../../utils/account";
import {logContract} from "../../../../utils/logger";
import {setupAlienMultiVault} from "../../../../utils/multivault/alien";
import {Ed25519KeyPair} from "nekoton-wasm";
import {Contract} from "locklift";
import {
    AlienTokenWalletUpgradeableAbi,
    BridgeAbi,
    CellEncoderStandaloneAbi,
    EthereumEverscaleEventConfigurationAbi,
    EverscaleEthereumEventConfigurationAbi,
    EverscaleSolanaEventConfigurationAbi,
    MergePool_V3Abi,
    MergeRouterAbi,
    MultiVaultEVMEverscaleEventAlienAbi, MultiVaultSolanaEverscaleEventAlienAbi,
    ProxyMultiVaultAlien_V6Abi,
    ProxyMultiVaultAlien_V7Abi,
    SolanaEverscaleEventConfigurationAbi,
    StakingMockupAbi,
    TokenRootAbi,
    TokenRootAlienEVMAbi, TokenRootAlienSolanaAbi
} from "../../../../../build/factorySource";
import {Account} from "everscale-standalone-client/nodejs";
import {deployTokenRoot} from "../../../../utils/token";
import {expect} from "chai";
import {EventAction, EventType, processEvent} from "../../../../utils/events";

const logger = require("mocha-logger");

let relays: Ed25519KeyPair[];
let bridge: Contract<BridgeAbi>;
let cellEncoder: Contract<CellEncoderStandaloneAbi>;
let staking: Contract<StakingMockupAbi>;
let bridgeOwner: Account;

let ethereumEverscaleEventConfiguration: Contract<EthereumEverscaleEventConfigurationAbi>;
let everscaleEthereumEventConfiguration: Contract<EverscaleEthereumEventConfigurationAbi>;
let solanaEverscaleEventConfiguration: Contract<SolanaEverscaleEventConfigurationAbi>;
let everscaleSolanaEventConfiguration: Contract<EverscaleSolanaEventConfigurationAbi>;
let initializer: Account;
let proxy: Contract<ProxyMultiVaultAlien_V7Abi>;

let alienTokenRoot: Contract<TokenRootAlienSolanaAbi>;
let customTokenRoot: Contract<TokenRootAbi>;
let mergeRouter: Contract<MergeRouterAbi>;
let mergePool: Contract<MergePool_V3Abi>;
let initializerAlienTokenWallet: Contract<AlienTokenWalletUpgradeableAbi>;


let eventContract: Contract<MultiVaultSolanaEverscaleEventAlienAbi>;

type EncodeMultiVaultAlienSolanaEverscaleParam = Parameters<
    Contract<CellEncoderStandaloneAbi>["methods"]["encodeMultiVaultAlienSolanaEverscale"]
    >[0];
let eventDataStructure: EncodeMultiVaultAlienSolanaEverscaleParam;

type EventVoteDataParam = Parameters<
    Contract<SolanaEverscaleEventConfigurationAbi>["methods"]["deployEvent"]
    >[0]["eventVoteData"];
let eventVoteData: EventVoteDataParam;

let eventDataEncoded: string;


describe('Deposit Alien token with merging with custom token', async function() {
    this.timeout(10000000);

    const alienTokenBase = {
        token: 222,
    };

    const alienTokenMeta = {
        name: 'Giga Chad',
        symbol: 'GIGA_CHAD',
        decimals: 6,
    };

    const customTokenMeta = {
        name: 'Custom Giga Chad',
        symbol: 'CUSTOM_GIGA_CHAD',
        decimals: 9
    };

    const amount = 333;

    it("Setup bridge", async () => {
        relays = await setupRelays();
        [bridge, bridgeOwner, staking, cellEncoder] = await setupBridge(relays);

        const signer = (await locklift.keystore.getSigner("0"))!;

        initializer = await deployAccount(signer, 50);

        await logContract("Initializer", initializer.address);

        [
            ethereumEverscaleEventConfiguration,
            everscaleEthereumEventConfiguration,
            solanaEverscaleEventConfiguration,
            everscaleSolanaEventConfiguration,
            proxy
        ] = await setupAlienMultiVault(bridgeOwner, staking);
    });

    it('Deploy custom token root', async () => {
        customTokenRoot = await deployTokenRoot(
            customTokenMeta.name,
            customTokenMeta.symbol,
            customTokenMeta.decimals,
            proxy.address
        );

        await logContract("Custom token root", customTokenRoot.address);
    });

    it('Deploy alien token root', async () => {
        await proxy.methods.deploySolanaAlienToken({
            ...alienTokenBase,
            ...alienTokenMeta,
            remainingGasTo: initializer.address
        }).send({
            from: initializer.address,
            amount: locklift.utils.toNano(5),
        });

        const alienTokenRootAddress = await proxy.methods.deriveSolanaAlienTokenRoot({
            ...alienTokenBase,
            ...alienTokenMeta,
            answerId: 0
        }).call();

        alienTokenRoot = await locklift.factory.getDeployedContract(
            'TokenRootAlienSolana',
            alienTokenRootAddress.value0
        );

        await logContract("Alien token root", alienTokenRoot.address);
    });

    it('Deploy merge router', async () => {
        await proxy.methods.deployMergeRouter({
            token: alienTokenRoot.address
        }).send({
            from: initializer.address,
            amount: locklift.utils.toNano(5)
        });

        const mergeRouterAddress = await proxy.methods.deriveMergeRouter({
            answerId: 0,
            token: alienTokenRoot.address
        }).call();

        mergeRouter = await locklift.factory.getDeployedContract(
            'MergeRouter',
            mergeRouterAddress.router
        );

        await logContract("Merge router", mergeRouter.address);
    });

    it('Deploy merge pool', async () => {
        const nonce = locklift.utils.getRandomNonce();

        await proxy.methods.deployMergePool({
            nonce,
            tokens: [alienTokenRoot.address, customTokenRoot.address],
            canonId: 1
        }).send({
            from: initializer.address,
            amount: locklift.utils.toNano(5)
        });

        const mergePoolAddress = await proxy.methods.deriveMergePool({
            nonce,
            answerId: 0
        }).call();

        mergePool = await locklift.factory.getDeployedContract(
            'MergePool_V3',
            mergePoolAddress.pool
        );

        await logContract("MergePool", mergePool.address);
    });

    it('Enable merge pool tokens', async () => {
        await mergePool.methods.enableAll().send({
            from: bridgeOwner.address,
            amount: locklift.utils.toNano(1)
        });

        const tokens = await mergePool.methods.getTokens({
            answerId: 0
        }).call();

        expect(tokens._tokens[0][1].enabled)
            .to.be.equal(true, 'Wrong alien status');
        expect(tokens._tokens[1][1].enabled)
            .to.be.equal(true, 'Wrong canon status');

        expect(tokens._canon.toString())
            .to.be.equal(customTokenRoot.address.toString(), 'Wrong canon token');
    });

    it('Set merge pool in router', async () => {
        await mergeRouter.methods.setPool({
            pool_: mergePool.address
        }).send({
            from: bridgeOwner.address,
            amount: locklift.utils.toNano(1)
        });

        const pool = await mergeRouter.methods.getPool({
            answerId: 0
        }).call();

        expect(pool.value0.toString())
            .to.be.equal(mergePool.address.toString(), 'Wrong pool in router');
    });

    it('Initialize event', async () => {
        eventDataStructure = {
            base_token: alienTokenBase.token,
            ...alienTokenMeta,

            amount,
            recipient: initializer.address,

            value: 10000,
            expected_evers: 1000,
            payload: ''
        };

        eventDataEncoded = await cellEncoder.methods
            .encodeMultiVaultAlienSolanaEverscale(eventDataStructure)
            .call()
            .then((t) => t.value0);

        eventVoteData = {
            accountSeed: 111,
            slot: 0,
            blockTime: 0,
            txSignature: "",
            eventData: eventDataEncoded,
        };

        const tx = await solanaEverscaleEventConfiguration.methods
            .deployEvent({
                eventVoteData,
            })
            .send({
                from: initializer.address,
                amount: locklift.utils.toNano(6),
            });

        logger.log(`Event initialization tx: ${tx.id.hash}`);

        const expectedEventContract = await solanaEverscaleEventConfiguration.methods
            .deriveEventAddress({
                eventVoteData: eventVoteData,
                answerId: 0,
            })
            .call();

        logger.log(`Expected event: ${expectedEventContract.eventContract}`);

        eventContract = await locklift.factory.getDeployedContract(
            "MultiVaultSolanaEverscaleEventAlien",
            expectedEventContract.eventContract
        );
    });

    it("Check event contract exists", async () => {
        expect(
            Number(await locklift.provider.getBalance(eventContract.address))
        ).to.be.greaterThan(0, "Event contract balance is zero");
    });

    it('Confirm event', async () => {
        await processEvent(
            relays,
            eventContract.address,
            EventType.EthereumEverscale,
            EventAction.Confirm
        );
    });

    it('Check alien total supply is zero', async () => {
        const totalSupply = await alienTokenRoot.methods.totalSupply({
            answerId: 0
        }).call();

        expect(Number(totalSupply.value0))
            .to.be.equal(0, 'Alien total supply should remain zero');
    });

    it('Check custom total supply', async () => {
        const totalSupply = await customTokenRoot.methods.totalSupply({
            answerId: 0
        }).call();

        expect(Number(totalSupply.value0))
            .to.be.equal(
                amount * (10 ** (customTokenMeta.decimals - alienTokenMeta.decimals)),
            'Wrong total supply after burn'
            );
    });
});
