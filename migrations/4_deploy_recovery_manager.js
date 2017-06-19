const RecoveryManager = artifacts.require('./RecoveryManager.sol')

module.exports = function (deployer) {
  deployer.deploy(RecoveryManager)
}
