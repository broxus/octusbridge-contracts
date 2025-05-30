import { BigNumber } from 'bignumber.js';
import { Address } from 'locklift';
import assert from 'node:assert';

import {
  ProxyMultiVaultAlien_V10Abi,
  ProxyMultiVaultNative_V8Abi,
} from '../../build/factorySource';
import { getConfig } from './configs';

const config = getConfig();

assert(!!config, 'Config should be defined');

interface DailyLimit {
  incomingLimit: BigNumber.Value | null;
  outgoingLimit: BigNumber.Value | null;
}

const nativeTokenToLimit: Record<string, DailyLimit> = {
  '0:6e599d8d7d024abecb5890150e4457760c6fe6028a16753bb63602c145277542': {
    incomingLimit: null,
    outgoingLimit: '100',
  },
};

// Canon token to limit
const alienTokenToLimit: Record<string, DailyLimit> = {
  '0:6e599d8d7d024abecb5890150e4457760c6fe6028a16753bb63602c145277542': {
    incomingLimit: '200',
    outgoingLimit: '200',
  },
};

const main = async (): Promise<void> => {
  await locklift.deployments.load();

  const admin = locklift.deployments.getAccount('Admin').account;
  const alienProxyMultiVault =
    locklift.deployments.getContract<ProxyMultiVaultAlien_V10Abi>(
      'ProxyMultiVaultAlien',
    );
  const nativeProxyMultiVault =
    locklift.deployments.getContract<ProxyMultiVaultNative_V8Abi>(
      'ProxyMultiVaultNative',
    );

  for (const token of Object.keys(nativeTokenToLimit)) {
    await locklift.tracing.trace(
      nativeProxyMultiVault.methods
        .setTokenDailyLimits({
          _token: new Address(token),
          _incomingLimit:
            nativeTokenToLimit[token].incomingLimit == null
              ? null
              : new BigNumber(
                  nativeTokenToLimit[token].incomingLimit!,
                ).toString(),
          _outgoingLimit:
            nativeTokenToLimit[token].outgoingLimit == null
              ? null
              : new BigNumber(
                  nativeTokenToLimit[token].outgoingLimit!,
                ).toString(),
          _remainingGasTo: admin.address,
        })
        .send({
          from: admin.address,
          amount: config.GAS.PROXY_MULTI_VAULT_SET_DAILY_LIMIT,
          bounce: false,
        }),
    );

    console.log(
      `Native: ${token} -> ${JSON.stringify(nativeTokenToLimit[token])}`,
    );
  }

  for (const token of Object.keys(alienTokenToLimit)) {
    await locklift.tracing.trace(
      alienProxyMultiVault.methods
        .setTokenDailyLimits({
          _token: new Address(token),
          _incomingLimit:
            alienTokenToLimit[token].incomingLimit == null
              ? null
              : new BigNumber(
                  alienTokenToLimit[token].incomingLimit!,
                ).toString(),
          _outgoingLimit:
            alienTokenToLimit[token].outgoingLimit == null
              ? null
              : new BigNumber(
                  alienTokenToLimit[token].outgoingLimit!,
                ).toString(),
          _remainingGasTo: admin.address,
        })
        .send({
          from: admin.address,
          amount: config.GAS.PROXY_MULTI_VAULT_SET_DAILY_LIMIT,
          bounce: false,
        }),
    );

    console.log(
      `Alien: ${token} -> ${JSON.stringify(alienTokenToLimit[token])}`,
    );
  }
};

main()
  .then(() => {
    console.log('Success');
  })
  .catch((err: unknown) => {
    console.error(err);
  });
