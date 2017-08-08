//HD Wallet for keyless servers (infura)
const HDWalletProvider = require("truffle-hdwallet-provider");
const TestRPC = require("ethereumjs-testrpc");

let provider

function getNmemonic() {
  try{
    return require('fs').readFileSync("./seed", "utf8").trim();
  } catch(err){
    return "";
  }
}

function getProvider(rpcUrl) {
  if (!provider) {
    provider = new HDWalletProvider(getNmemonic(), rpcUrl)
  }
  return provider
}


module.exports = {
  networks: {
    in_memory: {
      get provider() {
        if (!provider) {
          provider = TestRPC.provider({total_accounts: 25})
        }
        return provider
      },
      network_id: "*"
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,         // <-- Use port 8555
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    },
    local: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    ropsten: {
      get provider() {
        return getProvider("https://ropsten.infura.io/")
      },
      network_id: 3
    },
    rinkeby: {
      get provider() {
        return getProvider("https://rinkeby.infura.io/")
      },
      network_id: 4
    },
    infuranet: {
      get provider() {
        return getProvider("https://infuranet.infura.io/")
      },
      network_id: "*"
    },
    kovan: {
      get provider() {
        return getProvider("https://kovan.infura.io/")
      },
      network_id: 42
    },
    mainnet: {
      get provider() {
        return getProvider("https://mainnet.infura.io/")
      },
      network_id: 1
    }
  }
};
