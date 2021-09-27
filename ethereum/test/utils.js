const { expect } = require('chai');


const signReceipt = async (web3, receipt, signer) => {
  const receiptHash = web3
    .utils
    .soliditySha3(receipt)
    .toString('hex');
  
  const receiptSignature = await web3
    .eth
    .sign(receiptHash, signer);
  
  return receiptSignature;
};


const PREFIX = "VM Exception while processing transaction: ";

async function tryCatch(promise, message) {
  try {
    await promise;
    throw null;
  }
  catch (error) {
    if (!error) {
      throw Error("Expected an error but did not get one");
    }
    
    if (!error.message.startsWith(PREFIX + message)) {
      throw Error("Expected an error starting with '" + PREFIX + message + "' but got '" + error.message + "' instead");
    }
  }
}


module.exports = {
  signReceipt,
  tryCatch,
  catchRevertWithMessage : async function(promise, msg) { await tryCatch(promise, `revert ${msg}`); },
  catchRevert            : async function(promise) {await tryCatch(promise, "revert"             );},
  catchOutOfGas          : async function(promise) {await tryCatch(promise, "out of gas"         );},
  catchInvalidJump       : async function(promise) {await tryCatch(promise, "invalid JUMP"       );},
  catchInvalidOpcode     : async function(promise) {await tryCatch(promise, "invalid opcode"     );},
  catchStackOverflow     : async function(promise) {await tryCatch(promise, "stack overflow"     );},
  catchStackUnderflow    : async function(promise) {await tryCatch(promise, "stack underflow"    );},
  catchStaticStateChange : async function(promise) {await tryCatch(promise, "static state change");},
};
