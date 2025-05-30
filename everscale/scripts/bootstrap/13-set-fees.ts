import fees from "../../assets/fee_tokens.json";
import {ProxyMultiVaultAlien_V10Abi, ProxyMultiVaultNative_V8Abi} from "../../build/factorySource";
import {toNano} from "locklift";
import BigNumber from "bignumber.js";

const prompts = require("prompts");

const main = async () => {

  const admin = locklift.deployments.getAccount('Admin').account;
  const proxyNative = locklift.deployments.getContract<ProxyMultiVaultNative_V8Abi>('ProxyMultiVaultNative');
  const proxyAlien = locklift.deployments.getContract<ProxyMultiVaultAlien_V10Abi>('ProxyMultiVaultAlien');
  const DENOMINATOR = 100_000;


  const defaultFee = await prompts([
    {
      type: "number",
      name: "incomingNativeFee",
      message: "Default incoming native fee %",
      initial: 0.5
    },
    {
      type: "number",
      name: "outgoingNativeFee",
      message: "Default outgoing native fee %",
      initial: 0.5
    },
      {
      type: "number",
      name: "incomingAlienFee",
      message: "Default incoming alien fee %",
      initial: 0.5
    },
    {
      type: "number",
      name: "outgoingAlienFee",
      message: "Default outgoing alien fee %",
      initial: 0.5
    }
  ]);

  await proxyNative.methods.setTvmDefaultFeeNumerator({
    _incoming: new BigNumber(defaultFee.incomingNativeFee).times(DENOMINATOR).div(100).toString(),
    _outgoing: new BigNumber(defaultFee.outgoingNativeFee).times(DENOMINATOR).div(100).toString(),
  }).send({
      from: admin.address,
      amount: toNano(5)
  });

  await proxyAlien.methods.setTvmDefaultFeeNumerator({
    _incoming: new BigNumber(defaultFee.incomingAlienFee).times(DENOMINATOR).div(100).toString(),
    _outgoing: new BigNumber(defaultFee.outgoingAlienFee).times(DENOMINATOR).div(100).toString(),
  }).send({
      from: admin.address,
      amount: toNano(5)
  });

  for (let native_fee of fees.native) {

    await proxyNative.methods.setTvmTokenFee({
      _token: native_fee.token,
      _incoming: new BigNumber(native_fee.fee.incoming).times(DENOMINATOR).div(100).toString(),
      _outgoing: new BigNumber(native_fee.fee.outgoing).times(DENOMINATOR).div(100).toString(),
    }).send({
      from: admin.address,
      amount: toNano(5)
    });
  }

  for (let alien_fee of fees.alien) {

    await proxyAlien.methods.setTvmTokenFee({
      _token: alien_fee.token,
      _incoming: new BigNumber(alien_fee.fee.incoming).times(DENOMINATOR).div(100).toString(),
      _outgoing: new BigNumber(alien_fee.fee.outgoing).times(DENOMINATOR).div(100).toString(),
    }).send({
      from: admin.address,
      amount: toNano(5)
    });
  }
};

main().then(() => console.log('Success'));
