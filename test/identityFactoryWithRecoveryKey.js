require('./helpers.js')()

const IdentityFactoryWithRecoveryKey = artifacts.require('IdentityFactoryWithRecoveryKey')
const Proxy = artifacts.require('Proxy')
const StandardController = artifacts.require('StandardController')

contract("IdentityFactoryWithRecoveryKey", (accounts) => {
  var identityFactory;
  var proxy;
  var deployedProxy;
  var deployedRecoverableController;
  var standardController;
  var testReg;
  var user1;
  var admin;

  var contractAddresses;
  var proxyAddress;
  var recoverableControllerAddress;
  var recoveryKey;

  var delegateDeletedAfter =    0;
  var delegatePendingUntil =    1;
  var delegateProposedUserKey = 2;

  var shortTimeLock = 2;
  var longTimeLock = 7;

  before(() => {
    // Truffle deploys contracts with accounts[0]
    user1 = accounts[0];
    nobody = accounts[1];//has no authority
    recoveryUser1 = accounts[2];
    recoveryUser2 = accounts[3];
    recoveryKey = accounts[4];

    IdentityFactoryWithRecoveryKey.deployed().then((instance) => {
      identityFactoryWithRecoveryKey = instance
      return Proxy.deployed()
    }).then((instance) => {
      deployedProxy = instance
      return StandardController.deployed()
    }).then((instance) => {
      deployedRecoverableController = instance
    })

  });

  it("Correctly creates proxy and controller", (done) => {
    var event = identityFactoryWithRecoveryKey.IdentityCreated({creator: nobody})
    event.watch((error, result) => {
      event.stopWatching();
      // Check that event has addresses to correct contracts
      proxyAddress = result.args.proxy;
      recoverableControllerAddress = result.args.controller;
      recoveryKeyInContract = result.args.recoveryKey;

      assert.equal(web3.eth.getCode(proxyAddress),
                   web3.eth.getCode(deployedProxy.address),
                   "Created proxy should have correct code");
      assert.equal(web3.eth.getCode(recoverableControllerAddress),
                   web3.eth.getCode(deployedRecoverableController.address),
                   "Created controller should have correct code");
      assert.equal(recoveryKeyInContract, recoveryKey,
                   "Created recoveryQuorum should have correct code");
      proxy = Proxy.at(proxyAddress);
      standardController = StandardController.at(result.args.controller);
      // Check that the mapping has correct proxy address
      identityFactoryWithRecoveryKey.senderToProxy.call(nobody).then((createdProxyAddress) => {
        assert(createdProxyAddress, proxy.address, "Mapping should have the same address as event");
        done();
      }).catch(done);
    });
    identityFactoryWithRecoveryKey.CreateProxyWithControllerAndRecoveryKey(user1, recoveryKey, longTimeLock, shortTimeLock, {from: nobody})
  });

  it("Created proxy should have correct state", (done) => {
    proxy.owner.call().then((createdControllerAddress) => {
      assert.equal(createdControllerAddress, standardController.address);
      done();
    }).catch(done);
  });

  it("Created controller should have correct state", (done) => {
    standardController.proxy().then((_proxyAddress) => {
      assert.equal(_proxyAddress, proxy.address);
      return standardController.userKey();
    }).then((userKey) => {
      assert.equal(userKey, user1);
      return standardController.recoveryKey();
    }).then((rk) => {
      assert.equal(rk, recoveryKey);
      done();
    }).catch(done);
  });

});
