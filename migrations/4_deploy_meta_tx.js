const MetaIdentityManager = artifacts.require('./MetaIdentityManager.sol')
const TxRelay = artifacts.require('./TxRelay.sol')

module.exports = function (deployer) {
  deployer.deploy(MetaIdentityManager)
  deployer.deploy(TxRelay)
}
