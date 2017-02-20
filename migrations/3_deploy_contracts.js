var ProxyKeyFinder = artifacts.require("./libraries/ProxyKeyFinder.sol");

module.exports = function(deployer) {
  deployer.deploy(ProxyKeyFinder);
};
