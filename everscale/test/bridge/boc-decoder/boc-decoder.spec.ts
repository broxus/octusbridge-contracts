import { Contract, toNano, getRandomNonce } from "locklift";
import { expect } from "chai";

import { BocDecoderTestAbi } from "../../../build/factorySource";

const TRANSACTION = "te6ccgECCgEAAk8AA7VzdYk4k7jzwQD0H6+eDywhJSvEKLOTt+hiChUMFEAfZnAAAAAAAAAJ0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACcZ9ryHQADRngXeIBQQBAg0MBhlteoRAAwIAb8mD0JBMCiwgAAAAAAACAAAAAAADcuNRniYJhhTwzYvPKjYkZ0zZI8XqBI72d54LhvzzS9hAUBcUAJ1BdkMTiAAAAAAAAAAAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAIJyjmb3vMYy/kqgkVwsQ09wS1wB5QsrIpL8GFqQZm1Im8rVDhnIOerxSNLtG6ZBBI26FSKGsuF31UUu5/32zVE4NgIB4AgGAQHfBwC5aABusScSdx54IB6D9fPB5YQkpXiFFnJ2/QxBQqGCiAPszwAZIxMNuMxkUpxPdVbSLibd1c3Jr41xQMvNSZ2rCCvXppB3NZQABgosMAAAAAAAAAE8z7XkOi+sWyLgAd+IAG6xJxJ3HnggHoP188HlhCSleIUWcnb9DEFCoYKIA+zOBtWVYuOlg5/sIoqZpfS0q96B60dr+whc5UVSWDVR/lADM1ArmUoWT6Aks0Mvhtzhmwv9MApvStf/DMoyAleJsApdSWxTPteSyAAAAIgcCQBxYgAyRiYbcZjIpTie6q2kXE27q5uTXxrigZeakztWEFevTSDuaygAAAAAAAAAAAAAAAAAAF9YtkXA";
const INTERNAL_MESSAGE = "te6ccgEBAQEAXwAAuWgAbrEnEnceeCAeg/XzweWEJKV4hRZydv0MQUKhgogD7M8AGSMTDbjMZFKcT3VW0i4m3dXNya+NcUDLzUmdqwgr16aQdzWUAAYKLDAAAAAAAAABPM+15DovrFsi4A==";
const EXTERNAL_INBOUND_MESSAGE = "te6ccgEBAgEArgAB34gAbrEnEnceeCAeg/XzweWEJKV4hRZydv0MQUKhgogD7M4G1ZVi46WDn+wiipml9LSr3oHrR2v7CFzlRVJYNVH+UAMzUCuZShZPoCSzQy+G3OGbC/0wCm9K1/8MyjICV4mwCl1JbFM+15LIAAAAiBwBAHFiADJGJhtxmMilOJ7qraRcTburm5NfGuKBl5qTO1YQV69NIO5rKAAAAAAAAAAAAAAAAAAAX1i2RcA=";
const EXTERNAL_OUTBOUND_MESSAGE = "te6ccgEBBAEAuQABz+AB/nIV1yWzQuYDAm38u0hDBIk2jqs0XLBMICygQk5M4LgAAGuRGwjuIM+6vOwr68FHAAAAAAAAAAAAAAbSOtX4AAAAAAFgAtUEpLfucZnakECSnLZtRs5BjKWS9zSnLVG/7jhVCNsMAQIDz8ADAgBDIAUk5qcKxU0Kqq8xI6zxcnOzaRMAW8AGxI8jfJSPgiVJ7ABDIALNtbJWM8xVZ5wtdMiABFKS1Cfjbnz8oVdA/HQkL/CwbA==";
const MSG_HASH = "0x3425adbecf7e3f3508994ac03e74ea5776a0c403b7fd23da08dce01a3c505f11"

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
    const blockProof = await locklift.provider.packIntoCell({
      abiVersion: "2.3",
      structure: [
        { name: "tag", type: "uint32" },
        { name: "chainId", type: "int32" },
      ] as const,
      data: {
        tag: "0x11ef55aa",
        chainId: "137",
      },
    });

    const proof = await locklift.provider.packIntoCell({
      abiVersion: "2.3",
      structure: [{ name: "blockProof", type: "cell" }] as const,
      data: { blockProof: blockProof.boc },
    });

    const result = await decoder.methods
      .decodeBlockProof({ answerId: "0", _proof: proof.boc })
      .call();

    expect(result.chainId).to.be.equal("137");
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
    expect(result.body).to.be.equal("te6ccgEBBAEAiwABcyvrwUcAAAAAAAAAAAAABtI61fgAAAAAAWAC1QSkt+5xmdqQQJKctm1GzkGMpZL3NKctUb/uOFUI2wwBAgPPwAMCAEMgBSTmpwrFTQqqrzEjrPFyc7NpEwBbwAbEjyN8lI+CJUnsAEMgAs21slYzzFVnnC10yIAEUpLUJ+NufPyhV0D8dCQv8LBs");
    expect(result.info).to.deep.include({
      messageType: '1',
      messageDirection: '1',
      internalMessage: null,
    });
    expect(result.info.externalMessage!.src.toString()).to.be.equal("0:3fce42bae4b6685cc0604dbf976908609126d1d5668b96098405940849c99c17");
    expect(result.info.externalMessage!.dest.toString()).to.be.equal("");
    expect(result.info.externalMessage).to.deep.include({
      importFee: "0",
      createdLt: "59135484000016",
      createdAt: "1742560886",
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
