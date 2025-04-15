import { Account } from "everscale-standalone-client/nodejs";
import { Address, zeroAddress } from "locklift";

import { logContract } from "../logger";

export const setupTvmTvmEventConfiguration = async (
  owner: Account,
  proxy: Address,
  eventCode: string,
  transactionChecker: Address,
  eventEmitter: Address,
) => {
  const signer = (await locklift.keystore.getSigner("10"))!;

  const { contract: tvmTvmEventConfiguration } = await locklift.factory.deployContract({
    contract: "TvmTvmEventConfiguration",
    constructorParams: {
      _owner: owner.address,
      _flags: 0,
      _meta: "",
    },
    initParams: {
      basicConfiguration: {
        eventABI: "",
        eventInitialBalance: locklift.utils.toNano(1),
        staking: zeroAddress,
        eventCode,
      },
      networkConfiguration: {
        chainId: -239,
        proxy,
        startTimestamp: 0,
        endTimestamp: 0,
      },
      transactionChecker: transactionChecker,
      eventEmitter,
    },
    publicKey: signer.publicKey,
    value: locklift.utils.toNano(20),
  });

  await logContract("TvmTvmEventConfiguration", tvmTvmEventConfiguration.address);

  return tvmTvmEventConfiguration;
};
