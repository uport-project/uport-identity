module.exports = function(deployer) {
  deployer.deploy(ArrayLib);
  deployer.deploy(TestRegistry);
  deployer.deploy(Proxy);
  deployer.deploy(Owned);
  deployer.deploy(StandardController);
  deployer.deploy(IdentityFactory);
  deployer.deploy(RecoveryQuorum);
  deployer.deploy(IdentityFactoryWithRecoveryKey);
};
