import { Contract } from "locklift";
import { Mediator_V2Abi, ProxyMultiVaultAlien_V10Abi, ProxyMultiVaultNative_V8Abi } from "../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";

export const setupHiddenBridge = async (
  owner: Account,
  nativeProxy: Contract<ProxyMultiVaultNative_V8Abi>,
  alienProxy: Contract<ProxyMultiVaultAlien_V10Abi>,
): Promise<[Contract<Mediator_V2Abi>]> => {
  const signer = (await locklift.keystore.getSigner("0"))!;

  const configuration = await alienProxy.methods.getConfiguration({ answerId: 0 }).call({ responsible: true });

  const { contract: mediator } = await locklift.factory.deployContract({
    contract: "Mediator_V2",
    constructorParams: {
      _owner: owner.address,
      _nativeProxy: nativeProxy.address,
      _alienTokenWalletPlatformCode: configuration.value0.alienTokenWalletPlatformCode,
    },
    initParams: {
      _randomNonce: locklift.utils.getRandomNonce(),
    },
    publicKey: signer.publicKey,
    value: locklift.utils.toNano(15),
  });

  return [mediator];
};

export enum MediatorOperation {
  BurnToAlienProxy,
  BurnToMergePool,
  TransferToNativeProxy,
}
