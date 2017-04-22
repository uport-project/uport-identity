function compareCode(addr1, addr2) {
  let c1, c2
  return new Promise((resolve, reject) => {
    web3.eth.getCodeAsync(addr1).then(code => {
      c1 = code
      return web3.eth.getCodeAsync(addr2)
    }).then(code => {
      c2 = code
      assert.equal(c1, c2, 'the deployed contract has incorrect code')
      resolve()
    })
  })
}

module.exports = compareCode
