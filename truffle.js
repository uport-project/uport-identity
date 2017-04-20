//HD Wallet for keyless servers (infura)
var HDWalletProvider = require("truffle-hdwallet-provider");
function getNmemonic(){
  try{
    return require('fs').readFileSync("./seed", "utf8").trim();
  } catch(err){
    return "";
  }
}

var TestRPC = require("ethereumjs-testrpc");


module.exports = {
  networks: {
    in_memory: {
      provider: TestRPC.provider({total_accounts: 25}),
      network_id: "*",
    },
    local: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    ropsten: {
      provider: new HDWalletProvider(getNmemonic(), "https://ropsten.infura.io/"),
      network_id: 3
    },
    infuranet: {
      provider: new HDWalletProvider(getNmemonic(), "https://infuranet.infura.io/"),
      network_id: "*"
    },
    kovan: {
      provider: new HDWalletProvider(getNmemonic(), "https://kovan.infura.io/"),
      network_id: 42
    },
    mainnet: {
      provider: new HDWalletProvider(getNmemonic(), "https://mainnet.infura.io/"),
      network_id: 1
    }
  }
};
