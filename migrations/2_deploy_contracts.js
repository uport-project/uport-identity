var ArrayLib = artifacts.require("./libraries/ArrayLib.sol");
var IdentityFactory = artifacts.require("./factories/IdentityFactory.sol");

module.exports = function(deployer) {
  deployer.deploy(ArrayLib);
  deployer.link(ArrayLib, IdentityFactory);
  deployer.deploy(IdentityFactory);
};
