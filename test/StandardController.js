require('./helpers.js')()

const LOG_NUMBER_1 = 1234;
const LOG_NUMBER_2 = 2345;

contract("StandardController", (accounts) => {
  var standardController;
  var testReg;
  var user1;
  var user2;
  var user3;
  var admin1;
  var admin2;
  var shortTime = 2;//seconds
  var longTime =  4;

  before(() => {
    // Truffle deploys contracts with accounts[0]
    proxy = Proxy.deployed();
    testReg = TestRegistry.deployed();
    user1 = accounts[0];
    user2 = accounts[1];
    user3 = accounts[2];
    admin1 = accounts[3];
    admin2 = accounts[4];
    admin3 = accounts[5];
    nobody = accounts[6];
  });

  it("Correctly deploys contract", (done) => {
    StandardController.new(proxy.address, user1, longTime, shortTime).then((newOWA) => {
      standardController = newOWA;
      standardController.proxy().then((proxyAddress) => {
        assert.equal(proxyAddress, proxy.address);
        return standardController.userKey();
      }).then((userKey) => {
        assert.equal(userKey, user1);
        return standardController.changeRecoveryFromRecovery(admin1);
      }).then(() => {
        return standardController.recoveryKey();
      }).then((recoveryKey) => {
        assert.equal(recoveryKey, admin1);
        done();
      }).catch(done);
    });
  });

  it("Only sends transactions from correct user", (done) => {
    // Transfer ownership of proxy to the controller contract.
    proxy.transfer(standardController.address, {from:user1}).then(() => {
      // Encode the transaction to send to the Owner contract
      var data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1]);
      return standardController.forward(testReg.address, 0, data, {from: user1});
    }).then(() => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address);
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_1, "User1 should be able to send transaction");

      // Encode the transaction to send to the Owner contract
      var data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2]);
      return standardController.forward(testReg.address, 0, data, {from: user2});
    }).then(() => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address);
    }).then((regData) => {
      assert.notEqual(regData.toNumber(), LOG_NUMBER_2, "User2 should not be able to send transaction");
      done();
    }).catch(done);
  });

  it("Updates userKey as user", (done) => {//userkey is currently user1
    standardController.signUserKeyChange(user2, {from: user2}).then(() => {
      return standardController.proposedUserKey();
    }).then((proposedUserKey) => {
      assert.equal(proposedUserKey, 0x0, "Only user can set the proposedUserKey");
      return standardController.signUserKeyChange(user2, {from: user1})
    }).then(() => {
      return standardController.proposedUserKey()
    }).then((proposedUserKey) => {
      assert.equal(proposedUserKey, user2, "New user key should now be cued up");
      return standardController.userKey()
    }).then((userKey) => {
      assert.equal(userKey, user1, "UserKey should not change until changeUserKey is called");
      return standardController.changeUserKey({from: nobody})
    }).then(() => {
      return wait(shortTime + 1)
    }).then(() => {
      return standardController.userKey()
    }).then((userKey) => {
      assert.equal(userKey, user1, "Should still not have changed user key unless changeUserKey is called after shortTimeLock period");
      return standardController.changeUserKey({from: nobody})
    }).then(() => {
      return standardController.userKey()
    }).then((userKey) => {
      assert.equal(userKey, user2, "ChangeUserKey Should affect userKey after shortTimeLock period");
      done();
    }).catch(done);
  });

  it("Updates userKey as recovery", (done) => { //userkey is currently user2
    standardController.changeUserKeyFromRecovery(user3, {from: user2}).then(() => {
      return standardController.userKey();
    }).then((userKey) => {
      assert.equal(userKey, user2, "Only user can call changeUserKeyFromRecovery");
      return standardController.changeUserKeyFromRecovery(user3, {from: admin1})
    }).then(() => {
      return standardController.userKey()
    }).then((userKey) => {
      assert.equal(user3, user3, "New user should immediately take affect");
      done();
    }).catch(done);
  });

  it("Updates recovery as user", (done) => {//userkey is currently user3
    standardController.signRecoveryChange(admin2, {from: admin1}).then(() => {
      return standardController.proposedRecoveryKey();
    }).then((proposedRecoveryKey) => {
      assert.equal(proposedRecoveryKey, 0x0, "Only user can call signRecoveryChange");
      return standardController.signRecoveryChange(admin2, {from: user3})
    }).then(() => {
      return standardController.proposedRecoveryKey()
    }).then((proposedRecoveryKey) => {
      assert.equal(proposedRecoveryKey, admin2, "New recovery key should now be cued up");
      return standardController.recoveryKey()
    }).then((recoveryKey) => {
      assert.equal(recoveryKey, admin1, "recovery key should not change until changeRecovery is called");
      return standardController.changeRecovery({from: nobody})
    }).then(() => {
      return wait(longTime + 1)
    }).then(() => {
      return standardController.recoveryKey()
    }).then((recoveryKey) => {
      assert.equal(recoveryKey, admin1, "Should still not have changed recovery key unless changeRecovery is called after longTimeLock period");
      return standardController.changeRecovery({from: nobody})
    }).then(() => {
      return standardController.recoveryKey()
    }).then((recoveryKey) => {
      assert.equal(recoveryKey, admin2, "ChangeRecovery Should affect recoveryKey after longTimeLock period");
      done();
    }).catch(done);
  });  

  it("Updates recoveryKey as recovery", (done) => { //recoveryKey is currently admin2
    standardController.changeRecoveryFromRecovery(admin3, {from: user3}).then(() => {
      return standardController.recoveryKey();
    }).then((recoveryKey) => {
      assert.equal(recoveryKey, admin2, "Only recovery key can call changeRecoveryFromRecovery");
      return standardController.changeRecoveryFromRecovery(admin3, {from: admin2})
    }).then(() => {
      return standardController.recoveryKey()
    }).then((recoveryKey) => {
      assert.equal(recoveryKey, admin3, "New recoveryKey should immediately take affect");
      done();
    }).catch(done);
  });

  it("Correctly performs transfer", (done) => { //userKey is currently user3
    standardController.signControllerChange(user1, {from: admin1}).then(() => {
      return standardController.proposedController();
    }).then((proposedController) => {
      assert.equal(proposedController, 0x0, "Only user can set the proposedController");
      return standardController.signControllerChange(user1, {from: user3})
    }).then(() => {
      return standardController.proposedController()
    }).then((proposedController) => {
      assert.equal(proposedController, user1, "New controller should now be cued up");
      return proxy.owner();
    }).then((proxyOwner) => {
      assert.equal(proxyOwner, standardController.address, "proxy should not change until changeController is called");
      return standardController.changeController({from: nobody})
    }).then(() => {
      return wait(longTime + 1)
    }).then(() => {
      return proxy.owner()
    }).then((proxyOwner) => {
      assert.equal(proxyOwner, standardController.address, "Should still not have changed controller unless changeController is called after longTimeLock period");
      return standardController.changeController({from: nobody})
    }).then(() => {
      return proxy.owner()
    }).then((proxyOwner) => {
      assert.equal(proxyOwner, user1, "ChangeController Should affect proxy ownership after longTimeLock period");
      done();
    }).catch(done);
  });
});
