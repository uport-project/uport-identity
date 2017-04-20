const ArrayLib = artifacts.require('./libs/ArrayLib.sol')
const TestRegistry = artifacts.require('./misc/TestRegistry.sol')
const IdentityFactory = artifacts.require('./IdentityFactory.sol')
const IdentityFactoryWithRecoveryKey = artifacts.require('./IdentityFactoryWithRecoveryKey.sol')

const RecoveryQuorum = artifacts.require('./RecoveryQuorum.sol')

module.exports = function (deployer, network) {
  deployer.deploy(ArrayLib)
  deployer.link(ArrayLib, [RecoveryQuorum, IdentityFactory])
  deployer.deploy(IdentityFactory)
  deployer.deploy(IdentityFactoryWithRecoveryKey)

  if (network == 'in_memory') {
    deployer.deploy(TestRegistry)
  }
}
