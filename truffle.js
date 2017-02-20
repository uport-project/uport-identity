module.exports = {
  networks: {
    testrpc: {
      host: "localhost",
      port: 8545,
      network_id: "*"
    },
    ropsten: {
      host: "localhost",
      port: 8545,
      network_id: 3
    },
    ethereum: {
      host: "localhost",
      port: 8546,
      from: "0x36eaf0157ebe256088a779c12e96a3dc6f53426c",
      network_id: 1
    }
  }
};
