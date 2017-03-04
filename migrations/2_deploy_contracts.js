const Owned = artifacts.require('./libraries/Owned.sol')
const Proxy = artifacts.require('./libraries/Proxy.sol')
const TestRegistry = artifacts.require('./other/TestRegistry.sol')
const StandardController = artifacts.require('./other/StandardController.sol')
const ArrayLib = artifacts.require('./other/ArrayLib.sol')
const RecoveryQuorum = artifacts.require('./other/RecoveryQuorum.sol')

module.exports = function(deployer) {
  deployer.deploy(Owned);
  deployer.deploy(Proxy);
  deployer.deploy(TestRegistry);
  deployer.deploy(StandardController);
  deployer.deploy(ArrayLib);
  deployer.link(ArrayLib, RecoveryQuorum)
  deployer.deploy(RecoveryQuorum);
};
