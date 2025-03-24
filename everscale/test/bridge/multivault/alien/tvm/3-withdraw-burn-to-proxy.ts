import { Ed25519KeyPair } from "nekoton-wasm";
import { Address, Contract, toNano, zeroAddress } from "locklift";
import { Account } from "everscale-standalone-client/nodejs";
import { expect } from "chai";

import {
  CellEncoderStandaloneAbi,
  TVMEverscaleEventConfigurationAbi,
  StakingMockupAbi,
  TokenRootAlienTVMAbi,
  AlienTokenWalletUpgradeableAbi,
  ProxyMultiVaultAlien_V9Abi,
  TrustlessVerifierMockupAbi,
} from "../../../../../build/factorySource";

import { setupBridge, setupRelays } from "../../../../utils/bridge";
import { deployAccount } from "../../../../utils/account";
import { logContract } from "../../../../utils/logger";
import { setupAlienMultiVault } from "../../../../utils/multivault/alien";

const logger = require("mocha-logger");

let relays: Ed25519KeyPair[];
let cellEncoder: Contract<CellEncoderStandaloneAbi>;
let staking: Contract<StakingMockupAbi>;
let bridgeOwner: Account;
let trustlessVerifier: Contract<TrustlessVerifierMockupAbi>;

let tvmEverscaleEventConfiguration: Contract<TVMEverscaleEventConfigurationAbi>;
let initializer: Account;
let eventCloser: Account;
let proxy: Contract<ProxyMultiVaultAlien_V9Abi>;

let alienTokenRoot: Contract<TokenRootAlienTVMAbi>;
let initializerAlienTokenWallet: Contract<AlienTokenWalletUpgradeableAbi>;

describe.skip("Withdraw tokens by burning in favor of proxy", async function () {
  this.timeout(10000000);

  const alienTokenBase = {
    chainId: 111,
    token: new Address("0:4c46c7268222cfd4bd35e17ac48b05adb45b3514f64b276aaf7157f1b57b2a11"),
  };

  const alienTokenMeta = {
    name: "Giga Chad",
    symbol: "GIGA_CHAD",
    decimals: 6,
  };

  const mintAmount = 1000;
  const amount = 333;
  const recipient = new Address("0:4c46c7268222cfd4bd35e17ac48b05adb45b3514f64b276aaf7157f1b57b2a11");

  it("Setup bridge", async () => {
    relays = await setupRelays();
    [, bridgeOwner, staking, cellEncoder, trustlessVerifier] = await setupBridge(relays);

    const signer = (await locklift.keystore.getSigner("0"))!;

    initializer = await deployAccount(signer, 50);

    await logContract("Initializer", initializer.address);

    [, , , , proxy, tvmEverscaleEventConfiguration] = await setupAlienMultiVault(
      bridgeOwner,
      staking,
      trustlessVerifier,
    );

    eventCloser = await deployAccount((await locklift.keystore.getSigner("1"))!, 50);
  });

  it("Deploy alien token root", async () => {
    await proxy.methods
      .deployTVMAlienToken({
        ...alienTokenBase,
        ...alienTokenMeta,
        remainingGasTo: initializer.address,
      })
      .send({
        from: initializer.address,
        amount: locklift.utils.toNano(20),
      });

    const alienTokenRootAddress = await proxy.methods
      .deriveTVMAlienTokenRoot({
        ...alienTokenBase,
        ...alienTokenMeta,
        answerId: 0,
      })
      .call({ responsible: true });

    alienTokenRoot = locklift.factory.getDeployedContract("TokenRootAlienTVM", alienTokenRootAddress.value0);

    await logContract("Alien token root", alienTokenRoot.address);
  });

  it("Mint tokens to the initializer", async () => {
    const eventDataStructure = {
      base_chainId: alienTokenBase.chainId,
      base_token: alienTokenBase.token,
      ...alienTokenMeta,

      amount: mintAmount,
      recipient: initializer.address,

      value: 10000,
      expected_evers: 1000,
      payload: "",
    };

    const eventDataEncoded = await cellEncoder.methods
      .encodeMultiVaultAlienTVMEverscale(eventDataStructure)
      .call()
      .then(t => t.value0);

    const eventVoteData = {
      eventTransaction: 111,
      eventData: eventDataEncoded,
      eventBlockNumber: 333,
      eventBlock: 444,
      proof: "",
    };

    await locklift.transactions.waitFinalized(
      trustlessVerifier.methods.setApprove({ _approve: true }).send({
        from: bridgeOwner.address,
        amount: toNano(1),
        bounce: true,
      }),
    );

    const tx = await tvmEverscaleEventConfiguration.methods.deployEvent({ eventVoteData }).send({
      from: initializer.address,
      amount: locklift.utils.toNano(6),
    });

    logger.log(`Event initialization tx: ${tx.id}`);

    const expectedEventContract = await tvmEverscaleEventConfiguration.methods
      .deriveEventAddress({
        eventVoteData: eventVoteData,
        answerId: 0,
      })
      .call({ responsible: true });

    logger.log(`Expected event: ${expectedEventContract.eventContract}`);
  });

  it("Check initializer token balance", async () => {
    const walletAddress = await alienTokenRoot.methods
      .walletOf({
        answerId: 0,
        walletOwner: initializer.address,
      })
      .call({ responsible: true });

    initializerAlienTokenWallet = locklift.factory.getDeployedContract(
      "AlienTokenWalletUpgradeable",
      walletAddress.value0,
    );

    const balance = await initializerAlienTokenWallet.methods.balance({ answerId: 0 }).call({ responsible: true });

    expect(Number(balance.value0)).to.be.equal(mintAmount, "Wrong initializer token balance after mint");
  });

  it("Burn tokens in favor of proxy", async () => {
    const burnPayload = await cellEncoder.methods
      .encodeAlienBurnPayloadTVM({
        recipient,
        expectedGas: 0,
        payload: "",
      })
      .call();

    const tx = await initializerAlienTokenWallet.methods
      .burn({
        amount,
        remainingGasTo: eventCloser.address,
        callbackTo: proxy.address,
        payload: burnPayload.value0,
      })
      .send({
        from: initializer.address,
        amount: locklift.utils.toNano(10),
      });

    logger.log(`Event initialization tx: ${tx.id.hash}`);
  });

  it("Check total supply reduced", async () => {
    const totalSupply = await alienTokenRoot.methods.totalSupply({ answerId: 0 }).call({ responsible: true });

    expect(Number(totalSupply.value0)).to.be.equal(mintAmount - amount, "Wrong total supply after burn");
  });

  it("Check initializer token balance reduced", async () => {
    const balance = await initializerAlienTokenWallet.methods.balance({ answerId: 0 }).call({ responsible: true });

    expect(Number(balance.value0)).to.be.equal(mintAmount - amount, "Wrong initializer token balance after burn");
  });
});
