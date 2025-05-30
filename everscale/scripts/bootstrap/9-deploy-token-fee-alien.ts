import {ProxyMultiVaultAlien_V10Abi, ProxyMultiVaultNative_V8Abi} from "../../build/factorySource";
import {getConfig} from "./configs";
import assert from "node:assert";

const main = async () => {
  const config = getConfig();
  assert(!!config, "Config should be defined");
  const admin = locklift.deployments.getAccount('Admin').account;
  const proxyAlien = locklift.deployments.getContract<ProxyMultiVaultAlien_V10Abi>('ProxyMultiVaultAlien');

// d174d4b5cc0e07bdbb1447068e2c58e287d2ab8ad644027e69ba67720ff3a08c
//  c18475e7dad3f2229fb05a400d1907e14da4a7ce2ebdb612eef067a1578e7b3e
  const tokens = await locklift.provider.getAccountsByCodeHash({
    codeHash: 'd174d4b5cc0e07bdbb1447068e2c58e287d2ab8ad644027e69ba67720ff3a08c'
  }).then((r) => r.accounts);

  for (let i=0; i<tokens.length; i++) {

    await proxyAlien.methods.deployTokenFee({
      _token: tokens[i],
      _remainingGasTo: admin.address
    }).send({
      from: admin.address,
      amount: config?.GAS.PROXY_MULTI_VAULT_DEPLOY_TOKEN_FEE.toString()
  });

    const tokenFee = await  proxyAlien.methods.getExpectedTokenFeeAddress({answerId: 0, _token: tokens[i]})
      .call()
      .then((a) => a.value0);

    await locklift.deployments.saveContract({
      contractName: 'BridgeTokenFee',
      address: tokenFee,
      deploymentName: `tokenFeeAlien-${tokens[i]}`
    });
    console.log(`Token fee for alien ${tokens[i]} -> ${tokenFee}`);
  }

};

main().then(() => console.log('Success'));