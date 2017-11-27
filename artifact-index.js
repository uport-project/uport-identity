module.exports = {
  legacy: {
    ArrayLib: require('./build/contracts/legacy/ArrayLib.json'),
    IdentityFactory: require('./build/contracts/legacy/IdentityFactory.json'),
    IdentityFactoryWithRecoveryKey: require('./build/contracts/legacy/IdentityFactoryWithRecoveryKey.json'),
    Owned: require('./build/contracts/legacy/Owned.json'),
    RecoverableController: require('./build/contracts/legacy/RecoverableController.json'),
    RecoveryQuorum: require('./build/contracts/legacy/RecoveryQuorum.json'),
  },
  Controlled: {
    latestVersion: 'v1',
    v1: require('./build/contracts/versions/v1/Controlled.json'),
  },
  IdentityManager: {
    latestVersion: 'v2',
    v1: require('./build/contracts/versions/v1/IdentityManager.json'),
    v2: require('./build/contracts/versions/v2/IdentityManager.json'),
  },
  MetaIdentityManager: {
    latestVersion: 'v2',
    v1: require('./build/contracts/versions/v1/MetaIdentityManager.json'),
    v2: require('./build/contracts/versions/v2/MetaIdentityManager.json'),
  },
  Proxy: {
    latestVersion: 'v2',
    v1: require('./build/contracts/versions/v1/Proxy.json'),
    v2: require('./build/contracts/versions/v2/Proxy.json'),
  },
  TxRelay: {
    latestVersion: 'v2',
    v1: require('./build/contracts/versions/v1/TxRelay.json'),
    v2: require('./build/contracts/versions/v2/TxRelay.json'),
  }
}