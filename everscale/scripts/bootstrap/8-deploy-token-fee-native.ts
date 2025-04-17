import tokens from "../../assets/native_tokens.json";
import {ProxyMultiVaultNative_V7Abi} from "../../build/factorySource";
import {getConfig} from "./configs";
import {Address} from "locklift";

const main = async () => {

  const config = getConfig();
  const admin = locklift.deployments.getAccount('Admin').account;
  const proxyNative = locklift.deployments.getContract<ProxyMultiVaultNative_V7Abi>('ProxyMultiVaultNative');

  for (let i=0; i<tokens.length; i++) {
    let tokenRoot = locklift.factory.getDeployedContract('TokenRoot', new Address(tokens[i]));

    let proxyTokenWalletAddress = await tokenRoot.methods.walletOf({answerId: 0, walletOwner: proxyNative.address})
      .call()
      .then((a) => a.value0);

    await proxyNative.methods.deployTokenFee({
      _token: proxyTokenWalletAddress,
      _remainingGasTo: admin.address
    }).send({
      from: admin.address,
      amount: config!.GAS.PROXY_MULTI_VAULT_DEPLOY_TOKEN_FEE.toString()
    });

    const tokenFee = await  proxyNative.methods.getExpectedTokenFeeAddress({answerId: 0, _token: proxyTokenWalletAddress})
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