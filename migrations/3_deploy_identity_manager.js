const IdentityManager = artifacts.require('./IdentityManager.sol')

module.exports = function (deployer) {
  deployer.deploy(IdentityManager)
}
