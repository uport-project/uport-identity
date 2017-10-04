const delay = require('./delay')
const Promise = require('bluebird')
web3.version = Promise.promisifyAll(web3.version)
web3.eth = Promise.promisifyAll(web3.eth)

function increaseTime (seconds) {
  return new Promise(function(resolve, reject){
    web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [seconds],
        id: 0
      },
      resolve
    )
  })
}

async function waitTime (seconds) {
  let blockNum = await web3.eth.getBlockNumberAsync()
  let block = await web3.eth.getBlockAsync(blockNum)
  const startTime = block.timestamp
  let blockTime = startTime
  while (blockTime - startTime < seconds) {
    await delay(1000)
    blockNum = await web3.eth.getBlockNumberAsync()
    block = await web3.eth.getBlockAsync(blockNum)
    blockTime = block.timestamp
  }
}

module.exports = async function (seconds) {
  const netver = await web3.version.getNetworkAsync()
  if (netver !== "234") {
    return await increaseTime(seconds)
  } else {
    return await waitTime(seconds)
  }
}
