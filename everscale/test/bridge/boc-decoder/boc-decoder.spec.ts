import { Contract, toNano, getRandomNonce } from "locklift";
import { expect } from "chai";

import { BocDecoderTestAbi } from "../../../build/factorySource";

const TRANSACTION = "te6ccgECCgEAAk8AA7VzdYk4k7jzwQD0H6+eDywhJSvEKLOTt+hiChUMFEAfZnAAAAAAAAAJ0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACcZ9ryHQADRngXeIBQQBAg0MBhlteoRAAwIAb8mD0JBMCiwgAAAAAAACAAAAAAADcuNRniYJhhTwzYvPKjYkZ0zZI8XqBI72d54LhvzzS9hAUBcUAJ1BdkMTiAAAAAAAAAAAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAIJyjmb3vMYy/kqgkVwsQ09wS1wB5QsrIpL8GFqQZm1Im8rVDhnIOerxSNLtG6ZBBI26FSKGsuF31UUu5/32zVE4NgIB4AgGAQHfBwC5aABusScSdx54IB6D9fPB5YQkpXiFFnJ2/QxBQqGCiAPszwAZIxMNuMxkUpxPdVbSLibd1c3Jr41xQMvNSZ2rCCvXppB3NZQABgosMAAAAAAAAAE8z7XkOi+sWyLgAd+IAG6xJxJ3HnggHoP188HlhCSleIUWcnb9DEFCoYKIA+zOBtWVYuOlg5/sIoqZpfS0q96B60dr+whc5UVSWDVR/lADM1ArmUoWT6Aks0Mvhtzhmwv9MApvStf/DMoyAleJsApdSWxTPteSyAAAAIgcCQBxYgAyRiYbcZjIpTie6q2kXE27q5uTXxrigZeakztWEFevTSDuaygAAAAAAAAAAAAAAAAAAF9YtkXA";
const TRANSACTION_PROONED = "te6ccgECEQEAAmQACUYDvNloidsDsnKcfAYJlQmzKdaD2Jhur//NcI6UMCQJS98ACQEjt3dTY6ZRvDHMe2VGMb5DNmT6acYXmv/Jcd03LEu/3saGIAAABnBzvvygOM9R16AEyBrDhMRb6LtwM3uyUgKTsjYXQJXcgBNOsfAAAAZs1bpwNn5ECSAAVIh5dOnIBAMCKEgBAaU9UcOIOKDNbyqZtZ4xNraHV2k2y7YcdK0NZ0YZKLbcAAEoSAEBKJ6Uep86vjIItHA6Y5ZE5YklZCoqx2I/ldijqPIfjY4AACIB4BAFIgHdBwYoSAEB1Tp8sDb+PBG3Yslo5FgWixMKhOqYSuKxfextek0FJ9gAAQEBIAgBXeADqbHTKN4Y5j2yoxjfIZsyfTTjC81/5Ljum5Yl3+9jQxAAAADODnffls/IgSTACQN1Eerunv//6I+ADXqSipUvhlutkbUAk8NT7cfre3O4y9NJtzS2ZMZj/m8BIAAAAAAAAAAAAAAAB3NZQBAPDgoBg4AHD5XZsMSWPeErmtCyvgbh+N2wQZmqsidJj45tcAHFZ8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGPuv6ccAsBgwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAcPldmwxJY94Sua0LK+BuH43bBBmaqyJ0mPjm1wAcVn0AwBQ4AHD5XZsMSWPeErmtCyvgbh+N2wQZmqsidJj45tcAHFZ9ANAAAACFRTVDEAGFRlc3QgVG9rZW4gMShIAQHV7T1FsS//saQscofn6MxULN87UjtOv6QxLHKOXQ8xCgAH";
const INTERNAL_MESSAGE = "te6ccgEBAQEAXwAAuWgAbrEnEnceeCAeg/XzweWEJKV4hRZydv0MQUKhgogD7M8AGSMTDbjMZFKcT3VW0i4m3dXNya+NcUDLzUmdqwgr16aQdzWUAAYKLDAAAAAAAAABPM+15DovrFsi4A==";
const EXTERNAL_INBOUND_MESSAGE = "te6ccgEBAgEArgAB34gAbrEnEnceeCAeg/XzweWEJKV4hRZydv0MQUKhgogD7M4G1ZVi46WDn+wiipml9LSr3oHrR2v7CFzlRVJYNVH+UAMzUCuZShZPoCSzQy+G3OGbC/0wCm9K1/8MyjICV4mwCl1JbFM+15LIAAAAiBwBAHFiADJGJhtxmMilOJ7qraRcTburm5NfGuKBl5qTO1YQV69NIO5rKAAAAAAAAAAAAAAAAAAAX1i2RcA=";
const EXTERNAL_OUTBOUND_MESSAGE = "te6ccgECCAEAATcAAV3gA6mx0yjeGOY9sqMY3yGbMn004wvNf+S47puWJd/vY0MQAAAAzg5335bPyIEkwAEDdRHq7p7//+iPgA16koqVL4ZbrZG1AJPDU+3H63tzuMvTSbc0tmTGY/5vASAAAAAAAAAAAAAAAAdzWUAQBwYCAYOABw+V2bDElj3hK5rQsr4G4fjdsEGZqrInSY+ObXABxWfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABj7r+nHADAYMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAHD5XZsMSWPeErmtCyvgbh+N2wQZmqsidJj45tcAHFZ9AEAUOABw+V2bDElj3hK5rQsr4G4fjdsEGZqrInSY+ObXABxWfQBQAAAAhUU1QxABhUZXN0IFRva2VuIDE=";
const MSG_HASH = "0x3425adbecf7e3f3508994ac03e74ea5776a0c403b7fd23da08dce01a3c505f11"
const BLOCK_PROONED = "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";

describe("BocDecoder", () => {
  let decoder: Contract<BocDecoderTestAbi>
  
  before("Deploy decoder", async () => {
    const signer = await locklift.keystore.getSigner("0");

    const { contract: decoderContract } = await locklift.factory.deployContract({
      contract: "BocDecoderTest",
      constructorParams: {},
      initParams: { _randomNonce: getRandomNonce() },
      publicKey: signer!.publicKey,
      value: toNano(5),
    });

    decoder = decoderContract;
  });

  it("Decode block proof", async () => {
    const result = await decoder.methods
      .decodeBlockProof({ answerId: "0", _proof: BLOCK_PROONED })
      .call();

    expect(result.chainId).to.be.equal("-6001");
  });

  it("Decode transaction", async () => {
    const result = await decoder.methods
      .decodeTransaction({ answerId: 0, _txBoc: TRANSACTION })
      .call();

    expect(result).to.deep.equal({
      accountAddr: "25033707470278169307510072800051625189081644247975357591956553494129165858407",
      lt: "157",
      nowTimestamp: "1742402077",
      prevTransHash: "0",
      prevTransLt: "156",
      endStatus: "2",
      origStatus: "2",
      outmsgCnt: "1",
      inMessage: "te6ccgEBAgEArgAB34gAbrEnEnceeCAeg/XzweWEJKV4hRZydv0MQUKhgogD7M4G1ZVi46WDn+wiipml9LSr3oHrR2v7CFzlRVJYNVH+UAMzUCuZShZPoCSzQy+G3OGbC/0wCm9K1/8MyjICV4mwCl1JbFM+15LIAAAAiBwBAHFiADJGJhtxmMilOJ7qraRcTburm5NfGuKBl5qTO1YQV69NIO5rKAAAAAAAAAAAAAAAAAAAX1i2RcA=",
      outMessages: [["0", "te6ccgEBAQEAXwAAuWgAbrEnEnceeCAeg/XzweWEJKV4hRZydv0MQUKhgogD7M8AGSMTDbjMZFKcT3VW0i4m3dXNya+NcUDLzUmdqwgr16aQdzWUAAYKLDAAAAAAAAABPM+15DovrFsi4A=="]],
    });
  });

  it("Decode prooned transaction", async () => {
    const result = await decoder.methods
      .decodeTransactionShort({ answerId: 0, _txBoc: TRANSACTION_PROONED, _msgIndex: 0 })
      .call();

    expect(result).to.deep.equal({
      accountAddr: "53016416052906623898490362411228428656441597224820192323577312276686620616802",
      lt: "442503000010",
      nowTimestamp: "1743011986",
      outMessages: [["0", "te6ccgECCAEAATcAAV3gA6mx0yjeGOY9sqMY3yGbMn004wvNf+S47puWJd/vY0MQAAAAzg5335bPyIEkwAEDdRHq7p7//+iPgA16koqVL4ZbrZG1AJPDU+3H63tzuMvTSbc0tmTGY/5vASAAAAAAAAAAAAAAAAdzWUAQBwYCAYOABw+V2bDElj3hK5rQsr4G4fjdsEGZqrInSY+ObXABxWfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABj7r+nHADAYMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAHD5XZsMSWPeErmtCyvgbh+N2wQZmqsidJj45tcAHFZ9AEAUOABw+V2bDElj3hK5rQsr4G4fjdsEGZqrInSY+ObXABxWfQBQAAAAhUU1QxABhUZXN0IFRva2VuIDE="]],
    });
  });

  it("Decode external inbound message", async () => {
    const result = await decoder.methods
      .decodeMessages({ answerId: 0, _msgBoc: EXTERNAL_INBOUND_MESSAGE, _direction: null })
      .call();

    expect(result.init).to.be.null;
    expect(result.body).to.be.equal("te6ccgEBAgEAjAABm21ZVi46WDn+wiipml9LSr3oHrR2v7CFzlRVJYNVH+UAMzUCuZShZPoCSzQy+G3OGbC/0wCm9K1/8MyjICV4mwCl1JbFM+15LIAAAAiBwAEAcWIAMkYmG3GYyKU4nuqtpFxNu6ubk18a4oGXmpM7VhBXr00g7msoAAAAAAAAAAAAAAAAAABfWLZFwA==");
    expect(result.info).to.deep.include({
      messageType: '1',
      messageDirection: '0',
      internalMessage: null,
    });
    expect(result.info.externalMessage!.src.toString()).to.be.equal("");
    expect(result.info.externalMessage!.dest.toString()).to.be.equal("0:375893893b8f3c100f41faf9e0f2c21252bc428b393b7e8620a150c14401f667");
    expect(result.info.externalMessage).to.deep.include({
      importFee: "0",
      createdLt: "0",
      createdAt: "0",
    });
  });

  it("Decode external outbound message", async () => {
    const result = await decoder.methods
      .decodeMessages({ answerId: 0, _msgBoc: EXTERNAL_OUTBOUND_MESSAGE, _direction: null })
      .call();

    expect(result.init).to.be.null;
    expect(result.body).to.be.equal("te6ccgECCAEAAQkAAQHAAQN1Eerunv//6I+ADXqSipUvhlutkbUAk8NT7cfre3O4y9NJtzS2ZMZj/m8BIAAAAAAAAAAAAAAAB3NZQBAHBgIBg4AHD5XZsMSWPeErmtCyvgbh+N2wQZmqsidJj45tcAHFZ8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGPuv6ccAMBgwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAcPldmwxJY94Sua0LK+BuH43bBBmaqyJ0mPjm1wAcVn0AQBQ4AHD5XZsMSWPeErmtCyvgbh+N2wQZmqsidJj45tcAHFZ9AFAAAACFRTVDEAGFRlc3QgVG9rZW4gMQ==");
    expect(result.info).to.deep.include({
      messageType: '1',
      messageDirection: '1',
      internalMessage: null,
    });
    expect(result.info.externalMessage!.src.toString()).to.be.equal("0:75363a651bc31cc7b654631be433664fa69c6179affc971dd372c4bbfdec6862");
    expect(result.info.externalMessage!.dest.toString()).to.be.equal("");
    expect(result.info.externalMessage).to.deep.include({
      importFee: "0",
      createdLt: "442503000011",
      createdAt: "1743011986",
    });
  });

  it("Find message by hash and decode", async () => {
    const result = await decoder.methods
      .findMessageAndDecode({ answerId: 0, _txBoc: TRANSACTION, _msgHash: MSG_HASH })
      .call();

    expect(result.init).to.be.null;
    expect(result.body).to.be.equal("te6ccgEBAgEAjAABm21ZVi46WDn+wiipml9LSr3oHrR2v7CFzlRVJYNVH+UAMzUCuZShZPoCSzQy+G3OGbC/0wCm9K1/8MyjICV4mwCl1JbFM+15LIAAAAiBwAEAcWIAMkYmG3GYyKU4nuqtpFxNu6ubk18a4oGXmpM7VhBXr00g7msoAAAAAAAAAAAAAAAAAABfWLZFwA==");
    expect(result.info).to.deep.include({
      messageType: '1',
      messageDirection: '0',
      internalMessage: null,
    });
    expect(result.info.externalMessage!.src.toString()).to.be.equal("");
    expect(result.info.externalMessage!.dest.toString()).to.be.equal("0:375893893b8f3c100f41faf9e0f2c21252bc428b393b7e8620a150c14401f667");
    expect(result.info.externalMessage).to.deep.include({
      importFee: "0",
      createdLt: "0",
      createdAt: "0",
    });
  });

  it("Decode internal message", async () => {
    const result = await decoder.methods
      .decodeMessages({ answerId: 0, _msgBoc: INTERNAL_MESSAGE, _direction: 1 })
      .call();

    expect(result.init).to.be.null;
    expect(result.body).to.be.equal("te6ccgEBAQEABwAACS+sWyLg");
    expect(result.info).to.deep.include({
      messageType: '0',
      messageDirection: '1',
      externalMessage: null,
    });
    expect(result.info.internalMessage!.src.toString()).to.be.equal("0:375893893b8f3c100f41faf9e0f2c21252bc428b393b7e8620a150c14401f667");
    expect(result.info.internalMessage!.dest.toString()).to.be.equal("0:648c4c36e331914a713dd55b48b89b77573726be35c5032f352676ac20af5e9a");
    expect(result.info.internalMessage).to.deep.include({
      ihrDisabled: true,
      bounce: true,
      bounced: false,
      value: toNano(0.5),
      extraCurrency: [],
      ihrFee: "0",
      fwdFee: "333336",
      createdLt: "158",
      createdAt: "1742402077",
    });
  });
});
