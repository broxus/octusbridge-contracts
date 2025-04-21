import {ProxyMultiVaultAlien_V9Abi, ProxyMultiVaultNative_V7Abi} from "../build/factorySource";
import { getConfig } from "./bootstrap/configs";
import assert from "node:assert";

const main = async () => {
  const config = getConfig();

  assert(!!config, "Config should be defined");
  const admin = locklift.deployments.getAccount('Admin').account;
  const proxyAlien = locklift.deployments.getContract<ProxyMultiVaultAlien_V9Abi>('ProxyMultiVaultAlien');
  const proxyNative = locklift.deployments.getContract<ProxyMultiVaultNative_V7Abi>('ProxyMultiVaultNative');

  const tokenFees = await locklift.provider.getAccountsByCodeHash({
    codeHash: '13d634ab192a56c83a00ca9ec3b330b6fae93b187eb63db2777486543741285e'
  }).then((r) => r.accounts);

  await locklift.tracing.trace(
    proxyNative.methods.setTokenFeeCode({
      _code: locklift.factory.getContractArtifacts("BridgeTokenFee").code
    }).send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_TOKEN_FEE,
        bounce: true,
      }),
  );

  console.log(
    `Set token fee code to native proxy. Code hash: ${
      locklift.factory.getContractArtifacts("BridgeTokenFee").codeHash
    }`,
  );

  await locklift.tracing.trace(
    proxyAlien.methods.setTokenFeeCode({
      _code: locklift.factory.getContractArtifacts("BridgeTokenFee").code
    }).send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_TOKEN_FEE,
        bounce: true,
      }),
  );

  console.log(
    `Set token fee code to alien proxy. Code hash: ${
      locklift.factory.getContractArtifacts("BridgeTokenFee").codeHash
    }`,
  );

  for (let i=0; i<tokenFees.length; i++) {
    let tokenFeeContract = locklift.factory.getDeployedContract("BridgeTokenFee", tokenFees[i]);
    let proxy = await tokenFeeContract.methods.getProxy({answerId: 0}).call().then((a) => a.value0);

    if (proxy == proxyNative.address) {
      await locklift.tracing.trace(
        proxyNative.methods.upgradeTokenFee({_token: tokenFees[i], _remainingGasTo: admin.address}).send({
          from: admin.address,
          amount: config?.GAS.PROXY_MULTI_VAULT_UPGRADE_TOKEN_FEE,
          bounce: true,
        }),
      );

      console.log( `Success upgrade native token fee: ${tokenFees[i].toString()}`);

    } else if (proxy == proxyAlien.address) {

      await locklift.tracing.trace(
        proxyAlien.methods.upgradeTokenFee({_token: tokenFees[i], _remainingGasTo: admin.address}).send({
          from: admin.address,
          amount: config?.GAS.PROXY_MULTI_VAULT_UPGRADE_TOKEN_FEE,
          bounce: true,
        }),
      );

      console.log( `Success upgrade alien token fee: ${tokenFees[i].toString()}`);
    }
  }

};

main().then(() => console.log('Success'));