var ArrayLib = artifacts.require("./libraries/ArrayLib.sol");
var IdentityFactory = artifacts.require("./factories/IdentityFactory.sol");
var IdentityFactoryWithRecoveryKey = artifacts.require("./factories/IdentityFactoryWithRecoveryKey.sol");
var SensuiBank = artifacts.require("./other/SensuiBank.sol");
var UportRegistry = artifacts.require("./registries/UportRegistry.sol");

module.exports = function(deployer) {
  deployer.deploy(ArrayLib);
  deployer.link(ArrayLib, IdentityFactory);
  deployer.deploy(IdentityFactory);
  deployer.deploy(IdentityFactoryWithRecoveryKey);
  deployer.deploy(SensuiBank);
  // deployer.deploy(UportRegistry);
};
