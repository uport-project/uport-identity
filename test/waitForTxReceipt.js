const delay = require('./delay')
const Promise = require('bluebird')
web3.eth = Promise.promisifyAll(web3.eth)


async function waitForTxReceipt(txHash) {
  let receipt = await web3.eth.getTransactionReceiptAsync(txHash)
  while (receipt === null) {
    await delay(1000)
    receipt = await web3.eth.getTransactionReceiptAsync(txHash)
  }
  return receipt
}

module.exports = waitForTxReceipt
