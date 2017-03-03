const Contract = require('truffle-contract')
Web3 = require('web3');
Uport = {
  ArrayLib:                       Contract(require('./build/contracts/ArrayLib.json')),
  Migrations:                     Contract(require('./build/contracts/Migrations.json')),
  Owned:                          Contract(require('./build/contracts/Owned.json')),
  Proxy:                          Contract(require('./build/contracts/Proxy.json')),
  RecoveryQuorum:                 Contract(require('./build/contracts/RecoveryQuorum.json')),
  StandardController:             Contract(require('./build/contracts/StandardController.json')),
  Registry:                       Contract(require('./build/contracts/UportRegistry.json'))
}
