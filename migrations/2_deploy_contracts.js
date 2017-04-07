const ArrayLib = artifacts.require('./other/ArrayLib.sol')
const IdentityFactory = artifacts.require('./other/IdentityFactory.sol')
const IdentityFactoryWithRecoveryKey = artifacts.require('./other/IdentityFactoryWithRecoveryKey.sol')

const RecoveryQuorum = artifacts.require('./other/RecoveryQuorum.sol')

module.exports = function (deployer) {
  deployer.deploy(ArrayLib)
  deployer.link(ArrayLib, [RecoveryQuorum, IdentityFactory])
  deployer.deploy(IdentityFactory)
  deployer.deploy(IdentityFactoryWithRecoveryKey)
}
