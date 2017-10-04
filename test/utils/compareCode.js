const Promise = require('bluebird')
web3.eth = Promise.promisifyAll(web3.eth)

async function compareCode(addr1, addr2) {
  let c1 = await web3.eth.getCodeAsync(addr1)
  let c2 = await web3.eth.getCodeAsync(addr2)
  assert.equal(c1, c2, 'the deployed contract has incorrect code')
}

module.exports = compareCode
