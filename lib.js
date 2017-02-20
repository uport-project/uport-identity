const Contract = require('truffle-contract')
ArrayLib =                       Contract(require('./build/contracts/ArrayLib.json'))
IdentityFactory =                Contract(require('./build/contracts/IdentityFactory.json'))
IdentityFactoryWithRecoveryKey = Contract(require('./build/contracts/IdentityFactoryWithRecoveryKey.json'))
Migrations =                     Contract(require('./build/contracts/Migrations.json'))
Owned =                          Contract(require('./build/contracts/Owned.json'))
Proxy =                          Contract(require('./build/contracts/Proxy.json'))
ProxyKeyFinder =                 Contract(require('./build/contracts/ProxyKeyFinder.json'))
RecoveryQuorum =                 Contract(require('./build/contracts/RecoveryQuorum.json'))
SensuiBank =                     Contract(require('./build/contracts/SensuiBank.json'))
SharedController =               Contract(require('./build/contracts/SharedController.json'))
StandardController =             Contract(require('./build/contracts/StandardController.json'))
UportRegistry =                  Contract(require('./build/contracts/UportRegistry.json'))

Uport = {
  ArrayLib: ArrayLib,
  IdentityFactory: IdentityFactory,
  IdentityFactoryWithRecoveryKey: IdentityFactoryWithRecoveryKey,
}

module.exports = { Uport }
