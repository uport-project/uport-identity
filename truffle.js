//HD Wallet for keyless servers (infura)
const HDWalletProvider = require("truffle-hdwallet-provider");
const TestRPC = require("ethereumjs-testrpc");

function getNmemonic(){
  try{
    return require('fs').readFileSync("./seed", "utf8").trim();
  } catch(err){
    return "";
  }
}

let provider

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
    local: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    ropsten: {
      get provider() {
        if (!provider) {
          provider = new HDWalletProvider(getNmemonic(), "https://ropsten.infura.io/")
        }
        return provider
      },
      network_id: 3
    },
    rinkeby: {
      get provider() {
        if (!provider) {
          provider = new HDWalletProvider(getNmemonic(), "https://rinkeby.infura.io/")
        }
        return provider
      },
      network_id: 4
    },
    infuranet: {
      get provider() {
        if (!provider) {
          provider = new HDWalletProvider(getNmemonic(), "https://infuranet.infura.io/")
        }
        return provider
      },
      network_id: "*"
    },
    kovan: {
      get provider() {
        if (!provider) {
          provider = new HDWalletProvider(getNmemonic(), "https://kovan.infura.io/")
        }
        return provider
      },
      network_id: 42
    },
    mainnet: {
      get provider() {
        if (!provider) {
          provider = new HDWalletProvider(getNmemonic(), "https://mainnet.infura.io/")
        }
        return provider
      },
      network_id: 1
    }
  }
};
