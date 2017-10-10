const IdentityManager = artifacts.require('./IdentityManager.sol')
const TxRelay = artifacts.require('./TxRelay.sol')
const MetaIdentityManager = artifacts.require('./MetaIdentityManager.sol')

// TODO - specify these constants. They should also probably be different for different networks.
const USER_TIME_LOCK = 0;
const ADMIN_TIME_LOCK = 0;
const ADMIN_RATE = 0;

module.exports = async function (deployer) {
  await deployer.deploy(IdentityManager, USER_TIME_LOCK, ADMIN_TIME_LOCK, ADMIN_RATE)
  await deployer.deploy(TxRelay)
  await deployer.deploy(IdentityManager, USER_TIME_LOCK, ADMIN_TIME_LOCK, ADMIN_RATE, TxRelay.address)
}
