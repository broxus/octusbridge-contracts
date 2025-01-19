import { utils } from 'ethers';
import { Address, WalletTypes, toNano, getRandomNonce } from 'locklift';
import { BigNumber } from 'bignumber.js';
import assert from 'node:assert';

enum Network {
    BSC = 'BSC',
    POLYGON = 'POLYGON',
    AVALANCHE = 'AVALANCHE',
    ETHEREUM = 'ETHEREUM',
    CELO = 'CELO',
}

enum Token {
    USDT = 'USDT',
    DAI = 'DAI',
}

type MergeRouterInfo = {
    token: Token;
    network: Network;
    address: Address;
}

// Token params on its native network
type TokenParams = {
    network: Network;
    address: string;
    name: string;
    symbol: string;
    decimals: number;
};

type TokensConfig = {
    mergePool?: Address;
    reference: Network;
    tokens: TokenParams[];
};

const networkToId: Record<Network, number> = {
    [Network.BSC]: 56,
    [Network.ETHEREUM]: 1,
    [Network.POLYGON]: 137,
    [Network.AVALANCHE]: 43114,
    [Network.CELO]: 42220,
};

const tokenToConfig: Record<string, TokensConfig> = {
    [Token.USDT]: {
        reference: Network.ETHEREUM, // Token of this network will be used as 'main' for EVM->TVM transfers
        mergePool: new Address('0:8f95a32c53a0517d117505ecb5d20191f14341df6a81033c331a634249c0c002'), // Set it if merge pool is already deployed. New tokens will be connected to predeployed pool. In other case, new merge pool will be deployed
        tokens: [
            { network: Network.ETHEREUM, address: utils.getAddress('0xdac17f958d2ee523a2206206994597c13d831ec7'), name: 'Tether USD', symbol: 'USDT', decimals: 6 },
            { network: Network.BSC, address: utils.getAddress('0x55d398326f99059fF775485246999027B3197955'), name: 'Tether USD', symbol: 'USDT', decimals: 18 },
            { network: Network.POLYGON, address: utils.getAddress('0xc2132D05D31c914a87C6611C10748AEb04B58e8F'), name: '(PoS) Tether USD', symbol: 'USDT', decimals: 6 },
            { network: Network.AVALANCHE, address: utils.getAddress('0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7'), name: 'TetherToken', symbol: 'USDt', decimals: 6 },
            { network: Network.CELO, address: utils.getAddress('0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e'), name: 'Tether USD', symbol: 'USD₮', decimals: 6 },
        ],
    },
    [Token.DAI]: {
        reference: Network.ETHEREUM,
        mergePool: new Address('0:d488d922694ad0aeb09fdf3d416d4b4a26e3edfa87bfe5ad77d83b8f75aee362'),
        tokens: [
            { network: Network.ETHEREUM, address: utils.getAddress('0x6B175474E89094C44Da98b954EedeAC495271d0F'), name: 'Dai Stablecoin', symbol: 'DAI', decimals: 18 },
            { network: Network.BSC, address: utils.getAddress('0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3'), name: 'Dai Token', symbol: 'DAI', decimals: 18 },
            { network: Network.POLYGON, address: utils.getAddress('0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'), name: '(PoS) Dai Stablecoin', symbol: 'DAI', decimals: 18 },
            { network: Network.AVALANCHE, address: utils.getAddress('0xd586E7F844cEa2F87f50152665BCbc2C279D8d70'), name: 'Dai Stablecoin', symbol: 'DAI.e', decimals: 18 },
        ],
    },
};

const ALIEN_PROXY_MULTI_VAULT = new Address('0:3d2ee3ff7118b05c7ea39ff6cdefe8101814bc3753ca45654d76b6791611992a');
const ADMIN = new Address('0:2746d46337aa25d790c97f1aefb01a5de48cc1315b41a4f32753146a1e1aeb7d');

const Gas = {
    DEPLOY_ALIEN_TOKEN: toNano(120),
    DEPLOY_MERGE_ROUTER: toNano(120),
    DEPLOY_MERGE_POOL: toNano(120),
    MERGE_POOL_ADD_TOKEN: toNano(30),
    MERGE_POOL_ENABLE_ALL: toNano(60),
    MERGE_ROUTER_SET_POOL: toNano(30),
};

const main = async (): Promise<void> => {
    await locklift.factory.accounts.addExistingAccount({
        type: WalletTypes.EverWallet,
        address: ADMIN,
    });

    const alienProxyMultiVault = locklift.factory.getDeployedContract('ProxyMultiVaultAlien_V8', ALIEN_PROXY_MULTI_VAULT);
    const alienProxyMultiVaultState = await alienProxyMultiVault.getFullState().then((s) => s.state);

    const tokenToNetworkToAlienToken: Record<string, Record<string, Address>> = {};
    const pendingAlienTokenDeploys: Promise<unknown>[] = [];

    // Derive alien TIP-3 token address from EVM token on different network
    for (const [token, config] of Object.entries(tokenToConfig)) {
        tokenToNetworkToAlienToken[token] = {};

        for (const tokenParams of config.tokens) {
            const alienToken = await alienProxyMultiVault.methods
                .deriveEVMAlienTokenRoot({
                    answerId: 0,
                    chainId: networkToId[tokenParams.network],
                    token: new BigNumber(tokenParams.address.toLowerCase()).toString(10),
                    name: tokenParams.name,
                    symbol: tokenParams.symbol,
                    decimals: tokenParams.decimals,
                })
                .call({ cachedState: alienProxyMultiVaultState })
                .then((r) => r.value0);

            tokenToNetworkToAlienToken[token][tokenParams.network] = alienToken;

            console.log(`Alien token for ${tokenParams.network}-${token} -> ${alienToken.toString()}`);

            const isDeployed = await locklift.provider
                .getFullContractState({ address: alienToken })
                .then((r) => !!r.state?.isDeployed);

            if (!isDeployed) {
                console.log(`Deploying alien token for ${tokenParams.network}-${token}`);

                const deployTx = locklift.transactions.waitFinalized(
                    alienProxyMultiVault.methods
                        .deployEVMAlienToken({
                            chainId: networkToId[tokenParams.network],
                            token: new BigNumber(tokenParams.address.toLowerCase()).toString(10),
                            name: tokenParams.name,
                            symbol: tokenParams.symbol,
                            decimals: tokenParams.decimals,
                            remainingGasTo: ADMIN,
                        })
                        .send({ from: ADMIN, amount: Gas.DEPLOY_ALIEN_TOKEN, bounce: true }),
                );

                pendingAlienTokenDeploys.push(deployTx);
            }
        }
    }

    await Promise.all(pendingAlienTokenDeploys);

    console.log('[1] All alien tokens are deployed\n');

    const alienTokenToMergeRouter: Record<string, MergeRouterInfo> = {};
    const pendingMergeRouterDeploys: Promise<unknown>[] = [];

    // Derive merge router address for each alien TIP-3 token
    for (const token of Object.keys(tokenToNetworkToAlienToken)) {
        for (const [network, alienToken] of Object.entries(tokenToNetworkToAlienToken[token])) {
            const mergeRouter: MergeRouterInfo = {
                token: token as Token,
                network: network as Network,
                address: await alienProxyMultiVault.methods
                    .deriveMergeRouter({ answerId: 0, token: alienToken })
                    .call({ cachedState: alienProxyMultiVaultState })
                    .then((r) => r.router)
            };

            alienTokenToMergeRouter[alienToken.toString()] = mergeRouter;

            console.log(`Merge router for ${network}-${token} -> ${mergeRouter.address.toString()}`);

            const isDeployed = await locklift.provider
                .getFullContractState({ address: mergeRouter.address })
                .then((r) => !!r.state?.isDeployed);

            if (!isDeployed) {
                console.log(`Deploying merge router for ${network}-${token}`);

                const deployTx = locklift.transactions.waitFinalized(
                    alienProxyMultiVault.methods
                        .deployMergeRouter({ token: alienToken })
                        .send({ from: ADMIN, amount: Gas.DEPLOY_MERGE_ROUTER, bounce: true }),
                );

                pendingMergeRouterDeploys.push(deployTx);
            }
        }
    }

    await Promise.all(pendingMergeRouterDeploys);

    console.log('[2] All merge routers are deployed\n');

    const tokenToMergePool: Record<string, Address> = {};
    const pendingMergePoolTxs: Promise<unknown>[] = [];

    // Derive merge pool address for each token
    for (const [token, networkToAlienToken] of Object.entries(tokenToNetworkToAlienToken)) {
        const alienTokens = Object.values(networkToAlienToken);

        // Reuse old merge pool

        if (tokenToConfig[token].mergePool) {
            tokenToMergePool[token] = tokenToConfig[token].mergePool!;

            console.log(`Merge pool for ${token} -> ${tokenToMergePool[token].toString()}`);

            const mergePool = locklift.factory.getDeployedContract('MergePool_V5', tokenToMergePool[token]);
            const addedTokens = await mergePool.methods
                .getTokens({ answerId: 0 })
                .call()
                .then((r) => r._tokens.map((a) => a[0]));

            for (const alienToken of alienTokens) {
                if (!addedTokens.find((a) => a.equals(alienToken))) {
                    console.log(`Add alien token to merge pool ${token} -> ${alienToken}`);

                    const addTokenTx = locklift.transactions.waitFinalized(
                        mergePool.methods
                            .addToken({ token: alienToken })
                            .send({ from: ADMIN, amount: Gas.MERGE_POOL_ADD_TOKEN, bounce: true }),
                    );

                    pendingMergePoolTxs.push(addTokenTx);
                }
            }

            continue;
        }

        // Deploy new merge pool

        const nonce = getRandomNonce();

        const mergePool = await alienProxyMultiVault.methods
            .deriveMergePool({ answerId: 0, nonce: nonce })
            .call({ cachedState: alienProxyMultiVaultState })
            .then((r) => r.pool);

        tokenToMergePool[token] = mergePool;

        console.log(`Merge pool for ${token} -> ${mergePool.toString()}`);

        const isDeployed = await locklift.provider
            .getFullContractState({ address: mergePool })
            .then((r) => !!r.state?.isDeployed);

        if (!isDeployed) {
            const canonIndex = alienTokens.findIndex((a) =>
                a.equals(networkToAlienToken[tokenToConfig[token].reference])
            );

            assert(canonIndex >= 0, `${token} doesn't contain ${tokenToConfig[token].reference} network`);

            console.log(`Deploying merge pool for ${token}. Reference token network ${tokenToConfig[token].reference} -> ${alienTokens[canonIndex].toString()}`);

            const deployTx = locklift.transactions.waitFinalized(
                alienProxyMultiVault.methods
                    .deployMergePool({
                        nonce: nonce,
                        tokens: alienTokens,
                        canonId: canonIndex,
                    })
                    .send({ from: ADMIN, amount: Gas.DEPLOY_MERGE_POOL, bounce: true }),
            );

            pendingMergePoolTxs.push(deployTx);
        }
    }

    await Promise.all(pendingMergePoolTxs);

    console.log('[3] All merge pools are deployed and configured\n');

    const pendingMergeRouterTxs: Promise<unknown>[] = [];

    // Set merge pool to merge routers
    for (const [, mergeRouterInfo] of Object.entries(alienTokenToMergeRouter)) {
        const mergeRouter = locklift.factory.getDeployedContract('MergeRouter', mergeRouterInfo.address);
        const isRightMergePool = await mergeRouter.methods
            .getPool({ answerId: 0 })
            .call()
            .then((r) => r.value0.equals(mergeRouterInfo.address));

        if (!isRightMergePool) {
            console.log(`Set merge pool to ${mergeRouterInfo.network}-${mergeRouterInfo.token} merge router -> ${tokenToMergePool[mergeRouterInfo.token].toString()}`);

            const setPoolTx = locklift.transactions.waitFinalized(
                mergeRouter.methods
                    .setPool({pool_: tokenToMergePool[mergeRouterInfo.token]})
                    .send({from: ADMIN, amount: Gas.MERGE_ROUTER_SET_POOL, bounce: true}),
            );

            pendingMergePoolTxs.push(setPoolTx);
        }
    }

    await Promise.all(pendingMergeRouterTxs);

    console.log('[4] All merge routers are configured\n');

    const pendingMergePoolEnableTxs: Promise<unknown>[] = [];

    for (const [token, mergePoolAddress] of Object.entries(tokenToMergePool)) {
        const mergePool = locklift.factory.getDeployedContract("MergePool_V5", mergePoolAddress);

        console.log(`Enable ${token} merge pool`);

        const enableAllTx = locklift.transactions.waitFinalized(
            mergePool.methods
                .enableAll({})
                .send({ from: ADMIN, amount: Gas.MERGE_POOL_ENABLE_ALL, bounce: true }),
        );

        pendingMergePoolEnableTxs.push(enableAllTx);
    }

    await Promise.all(pendingMergePoolEnableTxs);

    console.log('[5] All merge pools are enabled\n');
};

main().then(() => console.log("Success"));
