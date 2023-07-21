import {logContract} from "./logger";
import {Contract} from "locklift";
import {
    MediatorAbi,
    ProxyMultiVaultAlien_V7Abi,
    ProxyMultiVaultNative_V4Abi, ProxyMultiVaultNative_V5Abi
} from "../../build/factorySource";
import {Account} from "everscale-standalone-client/nodejs";


export const setupHiddenBridge = async (
    owner: Account,
    nativeProxy: Contract<ProxyMultiVaultNative_V5Abi>,
    alienProxy: Contract<ProxyMultiVaultAlien_V7Abi>
): Promise<[
    Contract<MediatorAbi>
]> => {
    const signer = (await locklift.keystore.getSigner("0"))!;

    const configuration = await alienProxy.methods.getConfiguration({
        answerId: 0
    }).call();

    const {
        contract: mediator
    } = await locklift.factory.deployContract({
        contract: "Mediator",
        constructorParams: {
            _owner: owner.address,
            _nativeProxy: nativeProxy.address,
            _alienTokenWalletPlatformCode: configuration.value0.alienTokenWalletPlatformCode
        },
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce(),
        },
        publicKey: signer.publicKey,
        value: locklift.utils.toNano(15),
    });

    return [mediator];
}


export enum MediatorOperation {
    BurnToAlienProxy,
    BurnToMergePool,
    TransferToNativeProxy
}

