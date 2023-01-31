import {Address, Contract, zeroAddress} from "locklift";
import {FactorySource} from "../../build/factorySource";
import {Account} from "everscale-standalone-client/nodejs";
import {logContract} from "./logger";
const logger = require("mocha-logger");


export const deployTokenRoot = async function (
    token_name: string,
    token_symbol: string,
    decimals: number,
    owner: Address
) {
    const signer = (await locklift.keystore.getSigner("0"))!;

    const TokenWallet = await locklift.factory.getContractArtifacts(
        "TokenWallet"
    );

    const { contract: _root } = await locklift.factory.deployContract({
        contract: "TokenRoot",
        constructorParams: {
            initialSupplyTo: zeroAddress,
            initialSupply: 0,
            deployWalletValue: 0,
            mintDisabled: false,
            burnByRootDisabled: false,
            burnPaused: false,
            remainingGasTo: owner,
        },
        initParams: {
            name_: token_name,
            symbol_: token_symbol,
            decimals_: decimals,
            rootOwner_: owner,
            walletCode_: TokenWallet.code,
            randomNonce_: locklift.utils.getRandomNonce(),
            deployer_: zeroAddress,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(2),
    });

    return _root;
};


export const getTokenWalletAddr = async function (
    _root: Contract<FactorySource["TokenRoot"]>,
    user: Account
) {
    return await _root.methods
        .walletOf({ answerId: 0, walletOwner: user.address })
        .call()
        .then((t) => t.value0);
};


export const setupTokenRootWithWallet = async (
    rootOwner: Address,
    mintAmount: number,
    decimals = 9
) => {
    const signer = (await locklift.keystore.getSigner("2"))!;

    const tokenWallet = await locklift.factory.getContractArtifacts(
        "TokenWallet"
    );

    const { contract: root } = await locklift.factory.deployContract({
        contract: "TokenRoot",
        constructorParams: {
            initialSupplyTo: rootOwner,
            initialSupply: mintAmount,
            deployWalletValue: locklift.utils.toNano(0.1),
            mintDisabled: false,
            burnByRootDisabled: false,
            burnPaused: false,
            remainingGasTo: zeroAddress,
        },
        initParams: {
            deployer_: zeroAddress,
            randomNonce_: locklift.utils.getRandomNonce(),
            rootOwner_: rootOwner,
            name_: Buffer.from("Token").toString("hex"),
            symbol_: Buffer.from("TKN").toString("hex"),
            decimals_: decimals,
            walletCode_: tokenWallet.code,
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(2),
    });

    await logContract("root address", root.address);

    return root;
};


export const getTokenWalletByAddress = async (
    walletOwner: Address,
    rootAddress: Address
) => {
    const tokenRoot = await locklift.factory.getDeployedContract(
        "TokenRoot",
        rootAddress
    );

    const walletAddress = await tokenRoot.methods
        .walletOf({
            answerId: 0,
            walletOwner: walletOwner,
        })
        .call();

    const tokenWallet = await locklift.factory.getDeployedContract(
        "TokenWallet",
        walletAddress.value0
    );

    return tokenWallet;
};


export const getTokenRoot = async (rootAddress: Address) => {
    const tokenRoot = await locklift.factory.getDeployedContract(
        "TokenRoot",
        rootAddress
    );

    return tokenRoot;
};


export const depositTokens = async function (
    stakingRoot: Account,
    user: Account,
    _userTokenWallet: Contract<FactorySource["TokenWallet"]>,
    depositAmount: number,
    reward = false
) {
    var payload;
    const DEPOSIT_PAYLOAD = "te6ccgEBAQEAAwAAAgA=";
    const REWARD_DEPOSIT_PAYLOAD = "te6ccgEBAQEAAwAAAgE=";
    if (reward) {
        payload = REWARD_DEPOSIT_PAYLOAD;
    } else {
        payload = DEPOSIT_PAYLOAD;
    }

    return await sendTokens(
        user,
        _userTokenWallet,
        stakingRoot,
        depositAmount,
        payload
    );
};

// mint + deploy
const mintTokens = async function (
    owner: Account,
    users: Account[],
    _root: Contract<FactorySource["TokenRoot"]>,
    mint_amount: number
) {
    let wallets = [];
    for (const user of users) {
        await locklift.transactions.waitFinalized(
            _root.methods
                .mint({
                    amount: mint_amount,
                    recipient: user.address,
                    deployWalletValue: locklift.utils.toNano(1),
                    remainingGasTo: owner.address,
                    notify: false,
                    payload: "",
                })
                .send({
                    from: owner.address,
                    amount: locklift.utils.toNano(3),
                })
        );

        const walletAddr = await getTokenWalletAddr(_root, user);

        logger.log(`User token wallet: ${walletAddr}`);

        let userTokenWallet = await locklift.factory.getDeployedContract(
            "TokenWallet",
            walletAddr
        );

        wallets.push(userTokenWallet);
    }
    return wallets;
};


const sendTokens = async function (
    user: Account,
    _userTokenWallet: Contract<FactorySource["TokenWallet"]>,
    recipient: Account,
    amount: number,
    payload: any
) {
    const { traceTree } = await locklift.tracing.trace(
        _userTokenWallet.methods
            .transfer({
                amount: amount,
                recipient: recipient.address,
                deployWalletValue: 0,
                remainingGasTo: user.address,
                notify: true,
                payload: payload,
            })
            .send({
                from: user.address,
                amount: locklift.utils.toNano(11),
            }),
        {
            allowedCodes: {
                compute: [null],
            },
        }
    );
    // await traceTree?.beautyPrint();
};


export const deployTokenWallets = async function (
    users: Account[],
    _root: Contract<FactorySource["TokenRoot"]>
) {
    let wallets = [];
    for (const user of users) {
        await locklift.transactions.waitFinalized(
            _root.methods
                .deployWallet({
                    answerId: 0,
                    walletOwner: user.address,
                    deployWalletValue: locklift.utils.toNano(1),
                })
                .send({
                    from: user.address,
                    amount: locklift.utils.toNano(2),
                })
        );

        const walletAddr = await getTokenWalletAddr(_root, user);

        logger.log(`User token wallet: ${walletAddr}`);

        let userTokenWallet = await locklift.factory.getDeployedContract(
            "TokenWallet",
            walletAddr
        );

        wallets.push(userTokenWallet);
    }
    return wallets;
};
