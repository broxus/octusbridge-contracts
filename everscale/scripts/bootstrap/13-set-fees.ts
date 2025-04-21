import fees from "../../assets/fee_tokens.json";
import {ProxyMultiVaultAlien_V9Abi, ProxyMultiVaultNative_V7Abi} from "../../build/factorySource";
import {toNano} from "locklift";

const prompts = require("prompts");

const main = async () => {

  const admin = locklift.deployments.getAccount('Admin').account;
  const proxyNative = locklift.deployments.getContract<ProxyMultiVaultNative_V7Abi>('ProxyMultiVaultNative');
  const proxyAlien = locklift.deployments.getContract<ProxyMultiVaultAlien_V9Abi>('ProxyMultiVaultAlien');

  const defaultFee = await prompts([
    {
      type: "number",
      name: "incomingNativeFee",
      message: "Default incoming native fee",
      initial: 0.01
    },
    {
      type: "number",
      name: "outgoingNativeFee",
      message: "Default outgoing native fee",
      initial: 0.01
    },
      {
      type: "number",
      name: "incomingAlienFee",
      message: "Default incoming alien fee",
      initial: 0.01
    },
    {
      type: "number",
      name: "outgoingAlienFee",
      message: "Default outgoing alien fee",
      initial: 0.01
    }
  ]);

  await proxyNative.methods.setTvmDefaultFeeNumerator({
    _incoming: defaultFee.incomingNativeFee,
    _outgoing: defaultFee.outgoingNativeFee
  }).send({
      from: admin.address,
      amount: toNano(0.01)
  });

  await proxyAlien.methods.setTvmDefaultFeeNumerator({
    _incoming: defaultFee.incomingAlienFee,
    _outgoing: defaultFee.outgoingAlienFee
  }).send({
      from: admin.address,
      amount: toNano(0.01)
  });

  for (let native_fee of fees.native.length) {

    await proxyNative.methods.setTvmTokenFee({
      _token: native_fee.token,
      _incoming:native_fee.fee.incoming,
      _outgoing:native_fee.fee.outgoing
    }).send({
      from: admin.address,
      amount: toNano(0.01)
    });
  }

  for (let alien_fee of fees.alien.length) {

    await proxyAlien.methods.setTvmTokenFee({
      _token: alien_fee.token,
      _incoming:alien_fee.fee.incoming,
      _outgoing:alien_fee.fee.outgoing
    }).send({
      from: admin.address,
      amount: toNano(0.01)
    });
  }
};

main().then(() => console.log('Success'));