const IdentityManager = artifacts.require('./controllers/IdentityManager.sol')

module.exports = function (deployer) {
  deployer.deploy(IdentityManager)
}
