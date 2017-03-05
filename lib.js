const Contract = require('truffle-contract')

Uport = {
  ArrayLib:                       Contract(require('./build/contracts/ArrayLib.json')),
  IdentityFactory:                Contract(require('./build/contracts/IdentityFactory.json')),
  Migrations:                     Contract(require('./build/contracts/Migrations.json')),
  Owned:                          Contract(require('./build/contracts/Owned.json')),
  Proxy:                          Contract(require('./build/contracts/Proxy.json')),
  RecoveryQuorum:                 Contract(require('./build/contracts/RecoveryQuorum.json')),
  StandardController:             Contract(require('./build/contracts/StandardController.json'))
}

module.exports = { Uport }
