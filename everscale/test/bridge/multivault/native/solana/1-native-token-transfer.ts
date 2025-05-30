import { Ed25519KeyPair } from "nekoton-wasm";

import { expect } from "chai";
import { Contract } from "locklift";
import {
  BridgeAbi,
  CellEncoderStandaloneAbi,
  EthereumEverscaleEventConfigurationAbi,
  EverscaleEthereumEventConfigurationAbi,
  EverscaleSolanaEventConfigurationAbi,
  MultiVaultEverscaleSolanaEventNativeAbi,
  ProxyMultiVaultNative_V8Abi,
  SolanaEverscaleEventConfigurationAbi,
  StakingMockupAbi,
  TokenRootAbi,
  TokenWalletAbi,
  TrustlessVerifierMockupAbi,
} from "../../../../../build/factorySource";
import { Account } from "everscale-standalone-client/nodejs";
import { logContract } from "../../../../utils/logger";
import { setupBridge, setupRelays } from "../../../../utils/bridge";
import { setupNativeMultiVault } from "../../../../utils/multivault/native";
import { deployTokenRoot, getTokenWalletByAddress, mintTokens } from "../../../../utils/token";
import { deployAccount } from "../../../../utils/account";
import { EventAction, EventType, processEvent } from "../../../../utils/events";

const logger = require("mocha-logger");

let relays: Ed25519KeyPair[];
let bridge: Contract<BridgeAbi>;
let cellEncoder: Contract<CellEncoderStandaloneAbi>;
let staking: Contract<StakingMockupAbi>;
let bridgeOwner: Account;

let ethereumEverscaleEventConfiguration: Contract<EthereumEverscaleEventConfigurationAbi>;
let everscaleEthereumEventConfiguration: Contract<EverscaleEthereumEventConfigurationAbi>;
let solanaEverscaleEventConfiguration: Contract<SolanaEverscaleEventConfigurationAbi>;
let everscaleSolanaEventConfiguration: Contract<EverscaleSolanaEventConfigurationAbi>;
let proxy: Contract<ProxyMultiVaultNative_V8Abi>;
let initializer: Account;

let tokenRoot: Contract<TokenRootAbi>;
let initializerTokenWallet: Contract<TokenWalletAbi>;

let trustlessVerifier: Contract<TrustlessVerifierMockupAbi>;

describe("Test EVM native multivault pipeline", async function () {
  this.timeout(10000000);

  const tokenMeta = {
    name: "Custom Giga Chad",
    symbol: "CUSTOM_GIGA_CHAD",
    decimals: 9,
  };

  const executeAccounts = [
    {
      account: 123,
      readOnly: false,
      isSigner: true,
    },
  ];

  const mintAmount = 1000;
  const amount = 500;

  it("Setup bridge", async () => {
    relays = await setupRelays();
    [bridge, bridgeOwner, staking, cellEncoder, trustlessVerifier] = await setupBridge(relays);

    const signer = (await locklift.keystore.getSigner("0"))!;

    initializer = await deployAccount(signer, 50);

    await logContract("Initializer", initializer.address);

    [
      ethereumEverscaleEventConfiguration,
      everscaleEthereumEventConfiguration,
      solanaEverscaleEventConfiguration,
      everscaleSolanaEventConfiguration,
      proxy,
    ] = await setupNativeMultiVault(bridgeOwner, staking, trustlessVerifier);
  });

  it("Deploy native token root", async () => {
    tokenRoot = await deployTokenRoot(tokenMeta.name, tokenMeta.symbol, tokenMeta.decimals, bridgeOwner.address);

    await logContract("Custom token root", tokenRoot.address);
  });

  it("Mint tokens to initializer", async () => {
    await mintTokens(bridgeOwner, [initializer], tokenRoot, mintAmount);
  });

  it("Check initializer token balance", async () => {
    const walletAddress = await tokenRoot.methods
      .walletOf({
        answerId: 0,
        walletOwner: initializer.address,
      })
      .call({ responsible: true });

    initializerTokenWallet = locklift.factory.getDeployedContract("TokenWallet", walletAddress.value0);

    const balance = await initializerTokenWallet.methods.balance({ answerId: 0 }).call({ responsible: true });

    expect(Number(balance.value0)).to.be.equal(mintAmount, "Wrong initializer token balance after mint");
  });

  describe("Transfer native token from Everscale to EVM", async () => {
    const recipient = 111;
    // const chainId = 222;

    let eventContract: Contract<MultiVaultEverscaleSolanaEventNativeAbi>;

    it("Transfer tokens to the Native Proxy", async () => {
      const payload = await cellEncoder.methods
        .encodeNativeTransferPayloadSolana({
          recipient,
          executeAccounts,
          executePayloadNeeded: false,
          executePayloadAccounts: executeAccounts,
          solanaPayload: "",
        })
        .call()
        .then(t => t.value0);

      const tx = await locklift.tracing.trace(
        initializerTokenWallet.methods
          .transfer({
            amount,
            recipient: proxy.address,
            deployWalletValue: locklift.utils.toNano(0.2),
            remainingGasTo: initializer.address,
            notify: true,
            payload,
          })
          .send({
            from: initializer.address,
            amount: locklift.utils.toNano(10),
          }),
      );

      logger.log(`Token transfer tx: ${tx.id.hash}`);

      const events = await everscaleSolanaEventConfiguration
        .getPastEvents({ filter: "NewEventContract" })
        .then(e => e.events);

      expect(events).to.have.lengthOf(1, "Everscale event configuration failed to deploy event");

      const [
        {
          data: { eventContract: expectedEventContract },
        },
      ] = events;

      logger.log(`Expected event address: ${expectedEventContract}`);

      eventContract = locklift.factory.getDeployedContract(
        "MultiVaultEverscaleSolanaEventNative",
        expectedEventContract,
      );
    });

    it("Check initializer token balance", async () => {
      const balance = await initializerTokenWallet.methods.balance({ answerId: 0 }).call({ responsible: true });

      expect(Number(balance.value0)).to.be.equal(mintAmount - amount, "Wrong initializer token balance");
    });

    it("Check native proxy token balance", async () => {
      const proxyTokenWallet = await getTokenWalletByAddress(proxy.address, tokenRoot.address);

      const balance = await proxyTokenWallet.methods
        .balance({ answerId: 0 })
        .call({ responsible: true })
        .then((t: any) => t.value0);

      expect(Number(balance)).to.be.equal(amount, "Wrong initializer token balance");
    });

    it("Check event contract exists", async () => {
      expect(Number(await locklift.provider.getBalance(eventContract.address))).to.be.greaterThan(
        0,
        "Event contract balance is zero",
      );
    });

    it("Check event state before confirmation", async () => {
      const details = await eventContract.methods.getDetails({ answerId: 0 }).call({ responsible: true });

      expect(details._eventInitData.configuration.toString()).to.be.equal(
        everscaleSolanaEventConfiguration.address.toString(),
        "Wrong event configuration",
      );

      expect(details._status).to.be.equal("1", "Wrong status");

      expect(details._confirms).to.have.lengthOf(0, "Wrong amount of confirmations");

      expect(details._rejects).to.have.lengthOf(0, "Wrong amount of rejects");

      expect(details._initializer.toString()).to.be.equal(proxy.address.toString(), "Wrong initializer");
    });

    it("Check event data after mutation", async () => {
      const decodedData = await eventContract.methods.getDecodedData({ answerId: 0 }).call({ responsible: true });

      const proxyTokenWallet = await getTokenWalletByAddress(proxy.address, tokenRoot.address);

      expect(decodedData.proxy_.toString()).to.be.equal(proxy.address.toString(), "Wrong event decoded proxy");

      expect(decodedData.tokenWallet_.toString()).to.be.equal(
        proxyTokenWallet.address.toString(),
        "Wrong event decoded data token wallet",
      );

      expect(decodedData.token_.toString()).to.be.equal(tokenRoot.address.toString(), "Wrong event decoded token root");

      expect(decodedData.remainingGasTo_.toString()).to.be.equal(
        initializer.address.toString(),
        "Wrong event decoded remaining gas to",
      );

      expect(decodedData.amount_.toString()).to.be.equal(amount.toString(), "Wrong event decoded amount");

      expect(decodedData.recipient_.toString()).to.be.equal(recipient.toString(), "Wrong event decoded recipient");

      const name = await tokenRoot.methods
        .name({ answerId: 0 })
        .call({ responsible: true })
        .then(t => t.value0);

      const symbol = await tokenRoot.methods
        .symbol({ answerId: 0 })
        .call({ responsible: true })
        .then(t => t.value0);

      const decimals = await tokenRoot.methods
        .decimals({ answerId: 0 })
        .call({ responsible: true })
        .then(t => t.value0);

      expect(decodedData.name_).to.be.equal(name, "Wrong event decoded root name");
      expect(decodedData.symbol_).to.be.equal(symbol, "Wrong event decoded root symbol");
      expect(decodedData.decimals_).to.be.equal(decimals, "Wrong event decoded root decimals");
    });

    it("Check mutated event data", async () => {
      const eventInitData = await eventContract.methods.getEventInitData({ answerId: 0 }).call({ responsible: true });

      const decodedData = await cellEncoder.methods
        .decodeMultiVaultNativeEverscaleSolana({
          data: eventInitData.value0.voteData.eventData,
        })
        .call();

      expect(decodedData.token.toString()).to.be.equal(tokenRoot.address.toString(), "Wrong event data token");

      expect(decodedData.amount).to.be.equal(amount.toString(), "Wrong event data amount");

      expect(decodedData.recipient).to.be.equal(recipient.toString(), "Wrong event data recipient");

      const name = await tokenRoot.methods
        .name({ answerId: 0 })
        .call({ responsible: true })
        .then(t => t.value0);

      const symbol = await tokenRoot.methods
        .symbol({ answerId: 0 })
        .call({ responsible: true })
        .then(t => t.value0);

      const decimals = await tokenRoot.methods
        .decimals({ answerId: 0 })
        .call({ responsible: true })
        .then(t => t.value0);

      expect(decodedData.name).to.be.equal(name, "Wrong event data root name");
      expect(decodedData.symbol).to.be.equal(symbol, "Wrong event data root symbol");
      expect(decodedData.decimals).to.be.equal(decimals, "Wrong event data root decimals");
    });

    it("Check event required votes", async () => {
      const requiredVotes = await eventContract.methods
        .requiredVotes()
        .call()
        .then(t => parseInt(t.requiredVotes, 10));

      const relays = await eventContract.methods
        .getVoters({
          vote: 1,
          answerId: 0,
        })
        .call({ responsible: true });

      expect(requiredVotes).to.be.greaterThan(0, "Too low required votes for event");
      expect(relays.voters.length).to.be.greaterThanOrEqual(requiredVotes, "Too many required votes for event");
    });

    it("Confirm event enough times", async () => {
      await processEvent(relays, eventContract.address, EventType.EverscaleSolana, EventAction.Confirm);
    });

    it("Check event confirmed", async () => {
      const details = await eventContract.methods.getDetails({ answerId: 0 }).call({ responsible: true });

      const requiredVotes = await eventContract.methods
        .requiredVotes()
        .call()
        .then(t => parseInt(t.requiredVotes, 10));

      expect(Number(details.balance)).to.be.greaterThan(0, "Wrong balance");

      expect(details._status).to.be.equal("2", "Wrong status");

      expect(details._confirms).to.have.lengthOf(requiredVotes, "Wrong amount of relays confirmations");

      expect(details._rejects).to.have.lengthOf(0, "Wrong amount of relays rejects");
    });

    it("Close event", async () => {
      await eventContract.methods.close({}).send({
        from: initializer.address,
        amount: locklift.utils.toNano(1),
      });
    });
  });

  // describe("Transfer native token from EVM to Everscale", async () => {
  //   type EncodeMultiVaultNativeEVMEverscaleParam = Parameters<
  //       Contract<CellEncoderStandaloneAbi>["methods"]["encodeMultiVaultNativeEVMEverscale"]
  //       >[0];
  //   let eventDataStructure: EncodeMultiVaultNativeEVMEverscaleParam;
  //
  //   type EventVoteDataParam = Parameters<
  //       Contract<EthereumEverscaleEventConfigurationAbi>["methods"]["deployEvent"]
  //       >[0]["eventVoteData"];
  //
  //   let eventVoteData: EventVoteDataParam;
  //   let eventDataEncoded;
  //   let eventContract: Contract<MultiVaultEVMEverscaleEventNativeAbi>;
  //
  //   it("Initialize event", async () => {
  //     eventDataStructure = {
  //       token_wid: tokenRoot.address.toString().split(":")[0],
  //       token_addr: `0x${tokenRoot.address.toString().split(":")[1]}`,
  //       amount,
  //       recipient_wid: initializer.address.toString().split(":")[0],
  //       recipient_addr: `0x${initializer.address.toString().split(":")[1]}`,
  //       value: 0,
  //       expected_evers: 100,
  //       payload: ''
  //     };
  //
  //     eventDataEncoded = await cellEncoder.methods
  //         .encodeMultiVaultNativeEVMEverscale(eventDataStructure)
  //         .call()
  //         .then((t) => t.value0);
  //
  //     eventVoteData = {
  //       eventTransaction: 111,
  //       eventIndex: 222,
  //       eventData: eventDataEncoded,
  //       eventBlockNumber: 333,
  //       eventBlock: 444,
  //     };
  //
  //     const tx = await ethereumEverscaleEventConfiguration.methods
  //         .deployEvent({
  //           eventVoteData,
  //         })
  //         .send({
  //           from: initializer.address,
  //           amount: locklift.utils.toNano(6),
  //         });
  //
  //     logger.log(`Event initialization tx: ${tx.id}`);
  //
  //     const expectedEventContract = await ethereumEverscaleEventConfiguration.methods
  //         .deriveEventAddress({
  //           eventVoteData: eventVoteData,
  //           answerId: 0,
  //         })
  //         .call();
  //
  //     logger.log(
  //         `Expected event address: ${expectedEventContract.eventContract}`
  //     );
  //
  //     eventContract = await locklift.factory.getDeployedContract(
  //         "MultiVaultEVMEverscaleEventNative",
  //         expectedEventContract.eventContract
  //     );
  //   });
  //
  //   it("Check event contract exists", async () => {
  //     expect(
  //         Number(await locklift.provider.getBalance(eventContract.address))
  //     ).to.be.greaterThan(0, "Event contract balance is zero");
  //   });
  //
  //   it("Check event state before confirmation", async () => {
  //     const details = await eventContract.methods
  //         .getDetails({ answerId: 0 })
  //         .call();
  //
  //     expect(details._eventInitData.voteData.eventTransaction).to.be.equal(
  //         eventVoteData.eventTransaction.toString(),
  //         "Wrong event transaction"
  //     );
  //
  //     expect(details._eventInitData.voteData.eventIndex.toString()).to.be.equal(
  //         eventVoteData.eventIndex.toString(),
  //         "Wrong event index"
  //     );
  //
  //     expect(details._eventInitData.voteData.eventData).to.be.equal(
  //         eventVoteData.eventData,
  //         "Wrong event data"
  //     );
  //
  //     expect(details._eventInitData.voteData.eventBlockNumber).to.be.equal(
  //         eventVoteData.eventBlockNumber.toString(),
  //         "Wrong event block number"
  //     );
  //
  //     expect(details._eventInitData.voteData.eventBlock).to.be.equal(
  //         eventVoteData.eventBlock.toString(),
  //         "Wrong event block"
  //     );
  //
  //     expect(details._eventInitData.configuration.toString()).to.be.equal(
  //         ethereumEverscaleEventConfiguration.address.toString(),
  //         "Wrong event configuration"
  //     );
  //
  //     expect(details._eventInitData.staking.toString()).to.be.equal(
  //         staking.address.toString(),
  //         "Wrong staking"
  //     );
  //
  //     expect(details._status)
  //         .to.be.equal("1", "Wrong status");
  //
  //     expect(details._confirms).to.have.lengthOf(
  //         0,
  //         "Wrong amount of relays confirmations"
  //     );
  //
  //     expect(details._rejects).to.have.lengthOf(
  //         0,
  //         "Wrong amount of relays rejects"
  //     );
  //
  //     expect(details._initializer.toString()).to.be.equal(
  //         initializer.address.toString(),
  //         "Wrong initializer"
  //     );
  //   });
  //
  //   it("Check event decoded data", async () => {
  //     const decodedData = await eventContract.methods
  //         .getDecodedData({ answerId: 0 })
  //         .call();
  //
  //     expect(decodedData.token_.toString()).to.be.equal(
  //         tokenRoot.address.toString(),
  //         "Wrong event decoded data token"
  //     );
  //     expect(decodedData.amount_).to.be.equal(
  //         amount.toString(),
  //         "Wrong event decoded data amount"
  //     );
  //     expect(decodedData.recipient_.toString()).to.be.equal(
  //         initializer.address.toString(),
  //         "Wrong event decoded data recipient"
  //     );
  //     expect(decodedData.proxy_.toString()).to.be.equal(
  //         proxy.address.toString(),
  //         "Wrong event decoded data proxy"
  //     );
  //
  //     const proxyTokenWallet = await getTokenWalletByAddress(
  //         proxy.address,
  //         tokenRoot.address
  //     );
  //
  //     expect(decodedData.tokenWallet_.toString()).to.be.equal(
  //         proxyTokenWallet.address.toString(),
  //         "Wrong event decoded data token wallet"
  //     );
  //   });
  //
  //   it("Check event required votes", async () => {
  //     const requiredVotes = await eventContract.methods
  //         .requiredVotes()
  //         .call()
  //         .then((t) => parseInt(t.requiredVotes, 10));
  //
  //     const relays = await eventContract.methods
  //         .getVoters({
  //           vote: 1,
  //           answerId: 0,
  //         })
  //         .call();
  //
  //     expect(requiredVotes).to.be.greaterThan(
  //         0,
  //         "Too low required votes for event"
  //     );
  //     expect(relays.voters.length).to.be.greaterThanOrEqual(
  //         requiredVotes,
  //         "Too many required votes for event"
  //     );
  //   });
  //
  //   it("Check event round number", async () => {
  //     const roundNumber = await eventContract.methods.round_number({}).call();
  //
  //     expect(roundNumber.round_number).to.be.equal("0", "Wrong round number");
  //   });
  //
  //   it("Confirm event", async () => {
  //     await processEvent(
  //         relays,
  //         eventContract.address,
  //         EventType.EthereumEverscale,
  //         EventAction.Confirm,
  //     );
  //   });
  //
  //   it("Check event confirmed", async () => {
  //     const details = await eventContract.methods
  //         .getDetails({ answerId: 0 })
  //         .call();
  //
  //     const requiredVotes = await eventContract.methods
  //         .requiredVotes()
  //         .call()
  //         .then((t) => parseInt(t.requiredVotes, 10));
  //
  //     expect(details._status).to.be.equal("2", "Wrong status");
  //
  //     expect(details._confirms).to.have.lengthOf(
  //         requiredVotes,
  //         "Wrong amount of relays confirmations"
  //     );
  //
  //     expect(details._rejects).to.have.lengthOf(
  //         0,
  //         "Wrong amount of relays rejects"
  //     );
  //   });
  //
  //   it("Check initializer token balance", async () => {
  //     const balance = await initializerTokenWallet.methods
  //         .balance({ answerId: 0 })
  //         .call();
  //
  //     expect(parseInt(balance.value0, 10)).to.be.equal(
  //         mintAmount,
  //         "Wrong initializer token balance"
  //     );
  //   });
  //
  //   it("Check Native Proxy token balance is zero", async () => {
  //     const proxyTokenWallet = await getTokenWalletByAddress(
  //         proxy.address,
  //         tokenRoot.address
  //     );
  //
  //     const balance = await proxyTokenWallet.methods
  //         .balance({ answerId: 0 })
  //         .call()
  //         .then((t: any) => t.value0);
  //
  //     expect(balance)
  //         .to.be.equal("0", "Wrong Native Proxy token balance");
  //   });
  // });
});
