var ArrayLib = artifacts.require("./libraries/ArrayLib.sol");
var IdentityFactory = artifacts.require("./factories/IdentityFactory.sol");
var IdentityFactoryWithRecoveryKey = artifacts.require("./factories/IdentityFactoryWithRecoveryKey.sol");
var SensuiBank = artifacts.require("./other/SensuiBank.sol");
var UportRegistry1 = artifacts.require("./registries/UportRegistry1.sol");
var UportRegistry2 = artifacts.require("./registries/UportRegistry2.sol");
var UportRegistry3 = artifacts.require("./registries/UportRegistry3.sol");

module.exports = function(deployer) {
  deployer.deploy(ArrayLib);
  deployer.link(ArrayLib, IdentityFactory);
  deployer.link(ArrayLib, IdentityFactoryWithRecoveryKey);
  deployer.deploy(IdentityFactory);
  deployer.deploy(IdentityFactoryWithRecoveryKey);
  deployer.deploy(SensuiBank);
  deployer.deploy(UportRegistry1);
  deployer.deploy(UportRegistry2);
  deployer.deploy(UportRegistry3);
};
