const Promise = require('bluebird')
web3.version = Promise.promisifyAll(web3.version)

async function assertThrown(errorThrown, message) {
  const netver = await web3.version.getNetworkAsync()
  // WARNING: this is a workaround since geth does not throw errors when solidity throws.
  if (netver !== "234") {
    assert.isTrue(errorThrown, message)
  }
}

module.exports = assertThrown
