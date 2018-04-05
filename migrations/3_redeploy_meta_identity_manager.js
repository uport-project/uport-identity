const TxRelay = artifacts.require('./TxRelay.sol')
const MetaIdentityManager = artifacts.require('./MetaIdentityManager.sol')

const USER_TIME_LOCK = 3600
const ADMIN_TIME_LOCK = 129600
const ADMIN_RATE = 1200

module.exports = function (deployer) {
  deployer.deploy(MetaIdentityManager, USER_TIME_LOCK, ADMIN_TIME_LOCK, ADMIN_RATE, TxRelay.address)
}
