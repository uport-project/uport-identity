module.exports = {
  legacy: {
    ArrayLib: require('./build/contracts/legacy/ArrayLib.json'),
    IdentityFactory: require('./build/contracts/legacy/IdentityFactory.json'),
    IdentityFactoryWithRecoveryKey: require('./build/contracts/legacy/IdentityFactoryWithRecoveryKey.json'),
    RecoverableController: require('./build/contracts/legacy/RecoverableController.json'),
    RecoveryQuorum: require('./build/contracts/legacy/RecoveryQuorum.json'),
  },
  IdentityManager: {
    latestVersion: 'v1',
    v1: require('./build/contracts/versions/v1/IdentityManager.json'),
  },
  MetaIdentityManager: {
    latestVersion: 'v1',
    v1: require('./build/contracts/versions/v1/MetaIdentityManager.json'),
  },
  Owned: {
    latestVersion: 'v1',
    v1: require('./build/contracts/versions/v1/Owned.json'),
  },
  Proxy: {
    latestVersion: 'v1',
    v1: require('./build/contracts/versions/v1/Proxy.json'),
  },
  TxRelay: {
    latestVersion: 'v1',
    v1: require('./build/contracts/versions/v1/TxRelay.json'),
  }
}