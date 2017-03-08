const Contract = require('truffle-contract')

const UportContracts = {
  ArrayLib:                       Contract(require('./build/contracts/ArrayLib.json')),
  IdentityFactory:                Contract(require('./build/contracts/IdentityFactory.json')),
  Migrations:                     Contract(require('./build/contracts/Migrations.json')),
  Owned:                          Contract(require('./build/contracts/Owned.json')),
  Proxy:                          Contract(require('./build/contracts/Proxy.json')),
  RecoveryQuorum:                 Contract(require('./build/contracts/RecoveryQuorum.json')),
  RecoverableController:          Contract(require('./build/contracts/RecoverableController.json')),
  Registry:                       Contract(require('./build/contracts/UportRegistry.json'))
}

module.exports = UportContracts
