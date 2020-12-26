const fs = require('fs');
const BigNumber = require('bignumber.js');
const assert = require('assert');


const loadJSONFromFile = (filePath) => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};


const loadBase64FromFile = (filePath) => {
  return fs.readFileSync(filePath, 'utf8').split('\n').join('');
};


const getRandomNonce = () => Math.random() * 1000000000 | 0;


const convertCrystal = (crystalAmount, dimension) => {
  const crystalBN = new BigNumber(crystalAmount);
  
  if (dimension === 'nano') {
    return crystalBN.times(10**9).toFixed(0);
  }
};


const stringToBytesArray = (dataString) => {
  return Buffer.from(dataString).toString('hex')
};


async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function catchRunFail(runPromise, expectedExitCode) {
  try {
    await runPromise;
  } catch (e) {
    if (expectedExitCode !== undefined) {
      assert.equal(
        e.data.exit_code,
        expectedExitCode,
        "Wrong exit code"
      );
    }
    
    return;
  }
  
  throw new Error('Run succeed, expected fail');
}


module.exports = {
  loadJSONFromFile,
  loadBase64FromFile,
  getRandomNonce,
  convertCrystal,
  stringToBytesArray,
  sleep,
  catchRunFail,
};
