const readLine = require('readline');

const ask = (question) => {
  const read = readLine.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  return new Promise((resolve, reject) => {
    read.question(question, (answer) => {
      read.close();
      resolve(answer);
    });
  });
};




exports.readLine = ask;