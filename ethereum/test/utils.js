const ethers = require('ethers');


const signReceipt = async (web3, receipt, signer) => {
  const receiptHash = web3
    .utils
    .soliditySha3(receipt)
    .toString('hex');
  
  const messageHashBytes = ethers.utils.arrayify(receiptHash);
  
  return signer.signMessage(messageHashBytes);
};


module.exports = {
  signReceipt,
};
