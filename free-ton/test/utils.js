const fs = require('fs');


const loadJSONFromFile = (filePath) => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};


const loadBase64FromFile = (filePath) => {
  return fs.readFileSync(filePath, 'utf8').split('\n').join('');
};


const getRandomNonce = () => Math.random() * 1000000000 | 0;


const stringToBytesArray = (dataString) => {
  return Buffer.from(dataString).toString('hex')
};


module.exports = {
  loadJSONFromFile,
  loadBase64FromFile,
  getRandomNonce,
  stringToBytesArray,
};
