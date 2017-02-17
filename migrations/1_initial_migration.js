var Migrations = artifacts.require("./other/Migrations.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
