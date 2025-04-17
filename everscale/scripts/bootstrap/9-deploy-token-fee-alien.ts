import {ProxyMultiVaultAlien_V9Abi, ProxyMultiVaultNative_V7Abi} from "../../build/factorySource";
import {getConfig} from "./configs";

const main = async () => {
  const config = getConfig();
  const admin = locklift.deployments.getAccount('Admin').account;
  const proxyAlien = locklift.deployments.getContract<ProxyMultiVaultAlien_V9Abi>('ProxyMultiVaultAlien_V9');


  const tokens = await locklift.provider.getAccountsByCodeHash({
    codeHash: 'c18475e7dad3f2229fb05a400d1907e14da4a7ce2ebdb612eef067a1578e7b3e'
  }).then((r) => r.accounts);

  for (let i=0; i<tokens.length; i++) {

    await proxyAlien.methods.deployTokenFee({
      _token: tokens[i],
      _remainingGasTo: admin.address
    }).send({
      from: admin.address,
      amount: config!.GAS.PROXY_MULTI_VAULT_DEPLOY_TOKEN_FEE.toString()
  });

    const tokenFee = await  proxyAlien.methods.getExpectedTokenFeeAddress({answerId: 0, _token: tokens[i]})
      .call()
      .then((a) => a.value0);

    await locklift.deployments.saveContract({
      contractName: 'BridgeTokenFee',
      address: tokenFee,
      deploymentName: `tokenFeeNative-${tokens[i]}`
    });
    console.log(`Token fee for native ${tokens[i]} -> ${tokenFee}`);
  }

};

main().then(() => console.log('Success'));