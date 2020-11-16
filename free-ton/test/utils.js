const fs = require('fs');


const loadJSONFromFile = (filePath) => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};


const loadBase64FromFile = (filePath) => {
  return fs.readFileSync(filePath, 'utf8').split('\n').join('');
};


const getRandomNonce = () => Math.random() * 1000000000 | 0;


const stringToBytesArray = (dataString) => {
  return dataString
    .split("")
    .reduce((hex,c)=>[...hex, c.charCodeAt(0).toString(16).padStart(2,"0")],[]);
};


module.exports = {
  loadJSONFromFile,
  loadBase64FromFile,
  getRandomNonce,
  stringToBytesArray,
};
