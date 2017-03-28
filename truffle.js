module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8546,
      network_id: '*'
    },
    ropsten: {
      host: 'localhost',
      port: 8545,
      network_id: 3
    },
    ethereum: {
      host: 'localhost',
      port: 8545,
      network_id: 1,
      gas: 3141592
    }
  }
}
