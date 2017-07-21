function snapshot () {
  return new Promise(function(resolve, reject){
    web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_snapshot",
        params: [],
        id: 0
      },
      resolve
    )
  })
}

function revert (id) {
  return new Promise(function(resolve, reject){
    web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_revert",
        params: [id],
        id: 0
      },
      resolve
    )
  })
}

module.exports = {
  snapshot: snapshot,
  revert: revert
}
