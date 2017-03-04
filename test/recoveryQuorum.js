require('./helpers.js')()

const Proxy = artifacts.require('Proxy')
const StandardController = artifacts.require('StandardController')
const RecoveryQuorum = artifacts.require('RecoveryQuorum')

const LOG_NUMBER_1 = 1234;
const LOG_NUMBER_2 = 2345;

contract("RecoveryQuorum", (accounts) => {
  var userSigner;
  var proxySigner;

  var standardController;
  var recoveryQuorum;
  var user1;
  var user2;
  var recovery1;
  var delegateList;

  var delegateDeletedAfter =    0;
  var delegatePendingUntil =    1;
  var delegateProposedUserKey = 2;

  var shortTimeLock = 2;
  var longTimeLock  = 5;

  before(() => {
    user1 = accounts[0];
    user2 = accounts[1];
    recovery1 = accounts[2];
    delegateList = [
      accounts[3],
      accounts[4],
      accounts[5],
      accounts[6]
    ];
    largeDelegateList = [
      accounts[2],
      accounts[3],
      accounts[4],
      accounts[5],
      accounts[6],
      accounts[7],
      accounts[8],
      accounts[9],
      accounts[10],
      accounts[11],
      accounts[12],
      accounts[13],
      accounts[14],
      accounts[15],
    ];
    Proxy.deployed().then((instance) => {
      proxy = instance
    })
  });

  it("Correctly deploys contract", (done) => {
    StandardController.new(proxy.address, user1, longTimeLock, shortTimeLock, {from: recovery1})
    .then((newRC) => {
      standardController = newRC;
      return proxy.transfer(standardController.address, {from: accounts[0]});
    }).then(() => {
      return RecoveryQuorum.new(standardController.address, delegateList);
    }).then((newRQ) => {
      recoveryQuorum = newRQ;
      return standardController.changeRecoveryFromRecovery(recoveryQuorum.address, {from: recovery1});
    }).then(() => {
      return standardController.recoveryKey.call();
    }).then((RCrecoveryKey) => {
      assert.equal(RCrecoveryKey, recoveryQuorum.address, "Controller's recoverKey should be the RQ's address")
      return recoveryQuorum.controller.call();
    }).then((RCcontroller) => {
      assert.equal(RCcontroller, standardController.address, "RQ's controller var should be the controller's address")
      return recoveryQuorum.controller();
    }).then((controllerAddress) => {
      assert.equal(controllerAddress, standardController.address);
      return recoveryQuorum.delegates.call(delegateList[0]);
    }).then((delegate) => {
      assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0);
      return recoveryQuorum.delegates.call(delegateList[1]);
    }).then((delegate) => {
      assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0);
      return recoveryQuorum.delegates.call(delegateList[2]);
    }).then((delegate) => {
      assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0);
      return recoveryQuorum.delegates.call(delegateList[3]);
    }).then((delegate) => {
      assert.equal(delegate[delegateProposedUserKey], 0x0);
      assert.equal(delegate[delegatePendingUntil].toNumber(), 0);
      assert.isAtLeast(delegate[delegateDeletedAfter].toNumber(), 31536000000000);//million years
      return recoveryQuorum.delegates.call(user1);
    }).then((delegate) => {
      assert.equal(delegate[delegateDeletedAfter].toNumber(), 0);
      return recoveryQuorum.delegates.call(user2);
    }).then((delegate) => {
      assert.equal(delegate[delegateDeletedAfter].toNumber(), 0);
      return recoveryQuorum.delegates.call(recovery1);
    }).then((delegate) => {
      assert.equal(delegate[delegateDeletedAfter].toNumber(), 0);
      return recoveryQuorum.delegates.call(0x0);
    }).then((delegate) => {
      assert.equal(delegate[delegateDeletedAfter].toNumber(), 0);
      done();
    }).catch(done);
  });

  it("Non-delegate can't sign recovery", (done) => {
    recoveryQuorum.signUserChange(user2, {from: user1})
    .then(() => {
      return recoveryQuorum.collectedSignatures.call(user2);
    }).then((collectedSignatures) => {
      assert.equal(collectedSignatures.toNumber(), 0, "only delegates should be able to add to the number of collectedSigs.");
      done();
    }).catch(done);
  });

  it("delegate can sign recovery", (done) => {
    recoveryQuorum.signUserChange(user2, {from: delegateList[0]})
    .then(() => {
      return standardController.userKey.call();
    }).then((userKey) => {
      return recoveryQuorum.collectedSignatures.call(user2);
    }).then((collectedSignatures) => {
      assert.equal(collectedSignatures.toNumber(), 1, "Authorized delegate should add to the number of collectedSigs.");
      done();
    }).catch(done);
  });

  it("delegate can't sign recovery twice", (done) => {
    recoveryQuorum.signUserChange(user2, {from: delegateList[0]})
    .then(() => {
      return recoveryQuorum.collectedSignatures.call(user2);
    }).then((collectedSignatures) => {
      assert.equal(collectedSignatures.toNumber(), 1, "Delegate that already sign should not be able to sign again");
      done();
    }).catch(done);
  });

  it("Insufficient signatures can not recover controller user key", (done) => {
    recoveryQuorum.collectedSignatures.call(user2)
    .then((collectedSignatures) => {
      assert.equal(collectedSignatures.toNumber(), 1, "should keep track of how many votes user2 has (1)");
      return recoveryQuorum.changeUserKey(user2, {from: delegateList[0]});
    }).then(() => {
      return standardController.userKey.call();
    }).then((userKey) => {
      assert.equal(userKey, user1, "User key in controller should not have changed.");
      return recoveryQuorum.collectedSignatures.call(user2)
    }).then((collectedSignatures) => {
      assert.equal(collectedSignatures.toNumber(), 1, "should not have changed since called previously");
      done();
    }).catch(done);
  });

  it("Enough signatures can recover controller user key", (done) => {
    recoveryQuorum.signUserChange(user2, {from: delegateList[1]})
    .then(() => {
      return recoveryQuorum.signUserChange(user2, {from: delegateList[2]})
    }).then(() => {
      return recoveryQuorum.collectedSignatures.call(user2);
    }).then((collectedSigs) => {
      assert.equal(collectedSigs.toNumber(), 0, "collected sigs should e reset after changeUserKey")
      return standardController.userKey.call();
    }).then((userKey) => {
      assert.equal(userKey, user2, "User key in controller should have been updated.");
      return recoveryQuorum.delegates.call(user1);
    }).then((delegate) => {
      assert.equal(delegate[delegateProposedUserKey], 0x0, "Signatures should reset after a user key recovery");
      return recoveryQuorum.delegates.call(user2);
    }).then((delegate) => {
      assert.equal(delegate[delegateProposedUserKey], 0x0, "Signatures should reset after a user key recovery");
      return recoveryQuorum.delegates.call(delegateList[0]);
    }).then((delegate) => {
      assert.equal(delegate[delegateProposedUserKey], 0x0, "Signatures should reset after a user key recovery");
      return recoveryQuorum.delegates.call(delegateList[1]);
    }).then((delegate) => {
      assert.equal(delegate[delegateProposedUserKey], 0x0, "Signatures should reset after a user key recovery");
      return recoveryQuorum.getAddresses.call();})
    .then((addys) => {
      assert.equal(addys.length, 4);
      return recoveryQuorum.collectedSignatures.call(user2);
    }).then((collectedSignatures) => {
      assert.equal(collectedSignatures, 0, "Signatures should have reset after a user key recovery");
      done();
    }).catch(done);
  });

  it("Only controller user can add delegates to quorum", (done) => {
    web3.eth.sendTransaction({from: accounts[0], to: user2, value: web3.toWei('10', 'ether')});
    Proxy.new({from: accounts[0]})
    .then((newPX) => {
      proxy = newPX;
      return StandardController.new(proxy.address, user2, longTimeLock, shortTimeLock, {from: recovery1})})
    .then((newRC) => {
      standardController = newRC;
      return proxy.transfer(standardController.address, {from: accounts[0]});
    }).then(() => {
      return RecoveryQuorum.new(standardController.address, delegateList);
    }).then((newRQ) => {
      recoveryQuorum = newRQ;
      return standardController.changeRecoveryFromRecovery(recoveryQuorum.address, {from: recovery1});
    }).then(() => {
      return recoveryQuorum.replaceDelegates([], [accounts[7]], {from: user1})})
    .then(() => {
      return recoveryQuorum.delegateAddresses.call(0);})
    .then((addys) => {
      return recoveryQuorum.getAddresses.call();})
    .then((addys) => {
      return recoveryQuorum.delegates.call(accounts[7]);
    }).then((delegate) => {
      assert.equal(delegate[delegateDeletedAfter].toNumber(), 0, "Random user should not be able to add additional delegates to quorum.");
      return recoveryQuorum.getAddresses();})
    .then((addys) => {
      return recoveryQuorum.replaceDelegates([], [accounts[7]], {from: user2})
    }).then(() => {
      return recoveryQuorum.delegates.call(accounts[7]);
    }).then((delegate) => {
      assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0, "Controller userKey should be able to add additional delegates to quorum.");
      assert.approximately(delegate[delegatePendingUntil].toNumber(), Date.now()/1000 + longTimeLock, 5);
      return recoveryQuorum.signUserChange(0x123, {from: delegateList[1]});
    }).then(() => {
      return recoveryQuorum.delegates.call(delegateList[1]);
    }).then((delegate) => {
      assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0, "This delegate exists from contract creation");
      assert.equal(delegate[delegateProposedUserKey], 0x0123);
      assert.equal(delegate[delegatePendingUntil].toNumber(), 0);
      assert.isAtLeast(delegate[delegateDeletedAfter].toNumber(), 31536000000000, "inits to 1million years");
      return recoveryQuorum.replaceDelegates([], [delegateList[1]], {from: user2})
    }).then(() => {
      return recoveryQuorum.delegates.call(delegateList[1]);
    }).then((delegate) => {
      assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0, "Trying to add existing delegate should affect nothing");
      assert.equal(delegate[delegateProposedUserKey], 0x0123, "Trying to add existing delegate should affect nothing");
      assert.equal(delegate[delegatePendingUntil].toNumber(), 0, "Trying to add existing delegate should affect nothing");
      assert.isAtLeast(delegate[delegateDeletedAfter].toNumber(), 31536000000000, "Trying to add existing delegate should affect nothing");
      return recoveryQuorum.replaceDelegates([accounts[3],accounts[4]], [], {from: user2})
    }).then(() => {
      return wait(6)
    }).then(() => {
      return recoveryQuorum.replaceDelegates([], [accounts[4]], {from: user2})
    }).then(() => {
      return recoveryQuorum.getAddresses.call();
    }).then((delegateAddresses) => {
      assert.deepEqual(delegateAddresses, [accounts[7],accounts[6],accounts[5],accounts[4]])
      return recoveryQuorum.replaceDelegates([], [accounts[3]], {from: user2})
    }).then(() => {
      return wait(6)
    }).then(() => {
      return recoveryQuorum.getAddresses.call();
    }).then((delegateAddresses) => {
      assert.deepEqual(delegateAddresses, [accounts[7],accounts[6],accounts[5],accounts[4],accounts[3]])
      done();
    }).catch(done);
  });

  it("Newly added delegate's signature should not count towards quorum yet", (done) => {
    recoveryQuorum.replaceDelegates([], [accounts[8]], {from: user2})
    .then(() => {
      return recoveryQuorum.delegates.call(accounts[8]);
    }).then((delegate) => {
      assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0, "New delegate should have been added by user");
      assert.equal(delegate[delegateProposedUserKey], 0x0);
      assert.approximately(delegate[delegatePendingUntil].toNumber(), Date.now()/1000 + longTimeLock, 5);
      return recoveryQuorum.delegates.call(accounts[7]);
    }).then((delegate) =>{
      assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0, "New delegate should have been added by user");
      assert.equal(delegate[delegateProposedUserKey], 0x0);
      return recoveryQuorum.collectedSignatures.call(user2)
    }).then((collectedSignatures) => {
      assert.equal(collectedSignatures, 0, "Signatures should have reset after a user key recovery");
      return recoveryQuorum.signUserChange(user1, {from: accounts[8]});
    }).then(() => {
      return recoveryQuorum.collectedSignatures.call(user1)
    }).then((collectedSignatures) => {
      assert.equal(collectedSignatures, 0, "Newly added delegates should not be able to add valid signature yet");
      return recoveryQuorum.signUserChange(user1, {from: accounts[7]});
    }).then(() => {
      return recoveryQuorum.delegates.call(accounts[7]);
    }).then((delegate) => {
      assert.equal(delegate[delegateProposedUserKey], user1, "Proposed user should be set");
      return recoveryQuorum.changeUserKey(user1, {from: accounts[7]});
    }).then(() => {
      return standardController.userKey.call();
    }).then((userKey) => {
      assert.equal(userKey, user2, "controller userKey should not change because these delegates are too new");
      done();
    }).catch(done);
  });

  it("Allows you to remove a delegate, and add them back many times", (done) => {
    Proxy.new({from: accounts[0]})
    .then((newPX) => {
      proxy = newPX;
      return StandardController.new(proxy.address, user2, shortTimeLock , longTimeLock, {from: recovery1})})
    .then((newRC) => {
      standardController = newRC;
      return proxy.transfer(standardController.address, {from: accounts[0]});
    }).then(() => {
      return RecoveryQuorum.new(standardController.address, delegateList);//init with delegates
    }).then((newRQ) => {
      recoveryQuorum = newRQ;
      return standardController.changeRecoveryFromRecovery(recoveryQuorum.address, {from: recovery1});
    }).then(() => {
      return recoveryQuorum.getAddresses();
    }).then((delegateAddresses) => {
      assert.deepEqual(delegateAddresses, delegateList, "starts with delegates")
      return recoveryQuorum.replaceDelegates(delegateList, [], {from: user2})//remove them all
    }).then(() => {
      return recoveryQuorum.getAddresses();
    }).then((delegateAddresses) => {
      assert.deepEqual(delegateAddresses, delegateList, "current delegates are still there, but deletion pending")
      return wait(6)
    }).then(() => {
      return recoveryQuorum.replaceDelegates([], [], {from: user2})//trigger garbageCollection
    }).then(() => {
      return recoveryQuorum.getAddresses();
    }).then((delegateAddresses) => {
      assert.deepEqual(delegateAddresses, [], "after waiting and garbageCollection they are gone")
      return recoveryQuorum.replaceDelegates([], delegateList, {from: user2})//add them back
    }).then(() => {
      return recoveryQuorum.getAddresses();
    }).then((delegateAddresses) => {
      assert.deepEqual(delegateAddresses, delegateList, "immediately they are back")
      return recoveryQuorum.replaceDelegates([], delegateList, {from: user2})//try to add them twice
    }).then(() => {
      return recoveryQuorum.getAddresses();
    }).then((delegateAddresses) => {
      assert.deepEqual(delegateAddresses, delegateList, "doubling up should change nothing")
      return recoveryQuorum.replaceDelegates(delegateList, [], {from: user2})//remove them all again
    }).then(() => {
      return recoveryQuorum.getAddresses();
    }).then((delegateAddresses) => {
      assert.deepEqual(delegateAddresses, [], "pending delegates are deleted immediately")
      return recoveryQuorum.replaceDelegates([], largeDelegateList, {from: user2})//add lots of new delegates
    }).then(() => {
      return recoveryQuorum.getAddresses();
    }).then((delegateAddresses) => {
      assert.deepEqual(delegateAddresses, largeDelegateList, "old delegates are gone, and the new ones are present")
      done();
    }).catch(done);
  });



 // THE FOLLOWING TESTS REQUIRE 25 ACCOUNTS: `testrpc --accounts 25`
 //=================================================================

 it("protected against gasLimit attack. WARNING: strange error if gas is overspent", (done) => {
   Proxy.new({from: accounts[0]})
    .then((newPX) => {
      proxy = newPX;
      return StandardController.new(proxy.address, user2, 100000, 100000, {from: recovery1})})
    .then((newRC) => {
      standardController = newRC;
      return proxy.transfer(standardController.address, {from: accounts[0]});
    }).then(() => {
      return RecoveryQuorum.new(standardController.address, [accounts[1]]);//only 1 delegate
    }).then((newRQ) => {
      recoveryQuorum = newRQ;
      return standardController.changeRecoveryFromRecovery(recoveryQuorum.address, {from: recovery1});
    }).then(() => {
      return recoveryQuorum.replaceDelegates([accounts[1]], largeDelegateList, {from: user2})//add 14 more
    }).then(() => {
      return recoveryQuorum.replaceDelegates([], [accounts[16]], {from: user2})//try adding 16th delegate
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[2]});//add a vote or each $
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[3]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[4]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[5]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[6]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[7]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[8]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[9]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[10]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[11]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[12]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[13]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[14]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x123, {from: accounts[15]});
    }).then(() => {
      return recoveryQuorum.delegates.call(accounts[1]);
    }).then((delegate) => {
      assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0); //check state for OG delegate
      assert.equal(delegate[delegateProposedUserKey], 0x0);
      assert.equal(delegate[delegatePendingUntil].toNumber(), 0);
      assert.isAtLeast(delegate[delegateDeletedAfter].toNumber(), Date.now()/1000);//million years
      return recoveryQuorum.getAddresses()
    }).then((addys) => {
      assert.equal(addys.length, 15, "only first 15 delegates made it in");
      return recoveryQuorum.delegates.call(accounts[2]);
    }).then((delegate) => {
      assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0); //check state for a pending
      assert.equal(delegate[delegateProposedUserKey], 0x123);
      assert.isAtLeast(delegate[delegatePendingUntil].toNumber(),Date.now()/1000 + 10000);
      assert.equal(delegate[delegateDeletedAfter].toNumber(), 31536000000000);//million years
      return recoveryQuorum.delegates.call(accounts[16]);
    }).then((delegate) => {
      assert.equal(delegate[delegateDeletedAfter].toNumber(), 0); //16th delegate shouldn't exist cause we are full
      assert.equal(delegate[delegateProposedUserKey], 0x0);
      return recoveryQuorum.signUserChange(0x123, {from: accounts[1], gas: 1000000});
    }).then(() => {
      return standardController.userKey();
    }).then((userKey) => {
      assert.equal(userKey, 0x123, "enough gas was present to recover");
      done();
    }).catch(done);
  });

  it("protected against gasLimit attack. WARNING: strange error if gas is overspent", (done) => {
   Proxy.new({from: accounts[0]})
    .then((newPX) => {
      proxy = newPX;
      return StandardController.new(proxy.address, user2, 0, 0, {from: recovery1})})
    .then((newRC) => {
      standardController = newRC;
      return proxy.transfer(standardController.address, {from: accounts[0]});
    }).then(() => {
      largeDelegateList.push(accounts[1]);
      return RecoveryQuorum.new(standardController.address, largeDelegateList);//full 15 delegates
    }).then((newRQ) => {
      recoveryQuorum = newRQ;
      return standardController.changeRecoveryFromRecovery(recoveryQuorum.address, {from: recovery1});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x111, {from: accounts[1]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x222, {from: accounts[2]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x333, {from: accounts[3]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x444, {from: accounts[4]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x555, {from: accounts[5]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x666, {from: accounts[6]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x777, {from: accounts[7]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x456, {from: accounts[8]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x456, {from: accounts[9]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x456, {from: accounts[10]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x456, {from: accounts[11]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x456, {from: accounts[12]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x456, {from: accounts[13]});
    }).then(() => {
      return recoveryQuorum.signUserChange(0x456, {from: accounts[14]});
    }).then(() => {
      return recoveryQuorum.getAddresses()
    }).then((addys) => {
      assert.equal(addys.length, 15, "15 delegates from contract creation");
      return recoveryQuorum.delegates.call(accounts[1])
    }).then((delegate) => {
      assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0); //correct state for OG delegates
      assert.equal(delegate[delegateProposedUserKey], 0x111);
      assert.equal(delegate[delegatePendingUntil].toNumber(), 0);
      assert.isAtLeast(delegate[delegateDeletedAfter].toNumber(), Date.now()/1000);//million years
      return recoveryQuorum.delegates.call(accounts[16]);
    }).then((delegate) => {
      assert.equal(delegate[delegateDeletedAfter].toNumber(), 0); //16th delegate shouldn't exist cause we are full
      assert.equal(delegate[delegateProposedUserKey], 0x0);
      return recoveryQuorum.signUserChange(0x456, {from: accounts[15], gas: 1000000});
    }).then(() => {
      return standardController.userKey();
    }).then((userKey) => {
      assert.equal(userKey, 0x456, "enough gas was present to recover");
      done();
    }).catch(done);
  });
});
