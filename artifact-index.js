module.exports = {
  legacy: {
    ArrayLib: require('./build/contracts/legacy/ArrayLib.json'),
    IdentityFactory: require('./build/contracts/legacy/IdentityFactory.json'),
    IdentityFactoryWithRecoveryKey: require('./build/contracts/legacy/IdentityFactoryWithRecoveryKey.json'),
    RecoverableController: require('./build/contracts/legacy/RecoverableController.json'),
    RecoveryQuorum: require('./build/contracts/legacy/RecoveryQuorum.json'),
  },
  IdentityManager: {
    latestVersion: 'v2',
    v1: require('./build/contracts/versions/v1/IdentityManager.json'),
    v2: require('./build/contracts/versions/v2/IdentityManager.json'),
  },
  MetaIdentityManager: {
    latestVersion: 'v3',
    v1: require('./build/contracts/versions/v1/MetaIdentityManager.json'),
    v2: require('./build/contracts/versions/v2/MetaIdentityManager.json'),
    v3: require('./build/contracts/versions/v3/MetaIdentityManager.json'),
  },
  Owned: {
    latestVersion: 'v2',
    v1: require('./build/contracts/versions/v1/Owned.json'),
    v2: require('./build/contracts/versions/v2/Owned.json'),
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