import {ProxyMultiVaultAlien_V10Abi, ProxyMultiVaultNative_V8Abi} from "../../build/factorySource";
import {getConfig} from "./configs";
import assert from "node:assert";

const main = async () => {
  const config = getConfig();
  assert(!!config, "Config should be defined");

  const admin = locklift.deployments.getAccount('Admin').account;
  const proxyAlien = locklift.deployments.getContract<ProxyMultiVaultAlien_V10Abi>('ProxyMultiVaultAlien');
  const proxyNative = locklift.deployments.getContract<ProxyMultiVaultNative_V8Abi>('ProxyMultiVaultNative');

  await locklift.tracing.trace(
    proxyNative.methods.setPlatformCode({
      _code: locklift.factory.getContractArtifacts("Platform").code
    }).send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_PLATFORM,
        bounce: true,
      }),
  );

  console.log(
    `Set platform code to native proxy. Code hash: ${
      locklift.factory.getContractArtifacts("Platform").codeHash
    }`,
  );

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
    proxyAlien.methods.setPlatformCode({
      _code: locklift.factory.getContractArtifacts("Platform").code
    }).send({
        from: admin.address,
        amount: config?.GAS.PROXY_MULTI_VAULT_SET_PLATFORM,
        bounce: true,
      }),
  );

  console.log(
    `Set platform code to alien proxy. Code hash: ${
      locklift.factory.getContractArtifacts("Platform").codeHash
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

};

main().then(() => console.log('Success'));