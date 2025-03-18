import { Account } from "everscale-standalone-client/nodejs";
import { Address, zeroAddress } from "locklift";
import { logContract } from "../logger";

export const setupTVMEverscaleEventConfiguration = async (owner: Account, proxy: Address, eventCode: string) => {
  const signer = (await locklift.keystore.getSigner("10"))!;

  const { contract: tvmEverscaleEventConfiguration } = await locklift.factory.deployContract({
    contract: "TVMEverscaleEventConfiguration",
    constructorParams: {
      _owner: owner.address,
      _flags: 0,
      _meta: "",
    },
    initParams: {
      basicConfiguration: {
        eventABI: "",
        eventInitialBalance: locklift.utils.toNano(2),
        staking: zeroAddress,
        eventCode,
      },
      networkConfiguration: {
        chainId: 1,
        proxy,
        startBlockNumber: 0,
        endBlockNumber: 0,
      },
      transactionChecker: zeroAddress,
      eventEmitter: zeroAddress,
    },
    publicKey: signer.publicKey,
    value: locklift.utils.toNano(20),
  });

  await logContract("TVMEverscaleEventConfiguration", tvmEverscaleEventConfiguration.address);

  return tvmEverscaleEventConfiguration;
};
