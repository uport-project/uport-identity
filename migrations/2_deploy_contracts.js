const ArrayLib = artifacts.require('./other/ArrayLib.sol')
const TestRegistry = artifacts.require('./other/TestRegistry.sol')
const IdentityFactory = artifacts.require('./other/IdentityFactory.sol')
const IdentityFactoryWithRecoveryKey = artifacts.require('./other/IdentityFactoryWithRecoveryKey.sol')

const RecoveryQuorum = artifacts.require('./other/RecoveryQuorum.sol')

module.exports = function (deployer, network) {
  deployer.deploy(ArrayLib)
  deployer.link(ArrayLib, [RecoveryQuorum, IdentityFactory])
  deployer.deploy(IdentityFactory)
  deployer.deploy(IdentityFactoryWithRecoveryKey)

  if (network == 'in_memory') {
    deployer.deploy(TestRegistry)
  }
}
