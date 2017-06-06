const lightwallet = require('eth-signer')
const evm_increaseTime = require('./evmIncreaseTime.js')
const snapshots = require('./evmSnapshots.js')
const IdentityManager = artifacts.require('IdentityManager')
const RecoveryManager = artifacts.require('RecoveryManager')
const Proxy = artifacts.require('Proxy')
const TestRegistry = artifacts.require('TestRegistry')
const Promise = require('bluebird')
const compareCode = require('./compareCode')
web3.eth = Promise.promisifyAll(web3.eth)

const LOG_NUMBER_1 = 1234
const LOG_NUMBER_2 = 2345

const userTimeLock = 100;
const adminTimeLock = 1000;
const adminRate = 200;

contract('RecoveryManager', (accounts) => {
  let proxy
  let testReg
  let identityManager
  let recoveryManager
  let user1
  let delegate1
  let delegate2
  let delegate3
  let delegate4
  let delegates
  let nobody
  let newRecoveryKey
  let newRecoveryKey2

  let snapshotId

  before(done => {
    // Truffle deploys contracts with accounts[0]
    user1 = accounts[0]
    nobody = accounts[1] // has no authority
    delegate1 = accounts[2]
    delegate2 = accounts[3]
    delegate3 = accounts[4]
    delegate4 = accounts[5]
    delegates = [delegate1, delegate2, delegate3, delegate4]
    newRecoveryKey = accounts[8]
    newRecoveryKey2 = accounts[9]
    IdentityManager.new(userTimeLock, adminTimeLock, adminRate).then((instance) => {
      identityManager = instance
      return TestRegistry.deployed()
    }).then((instance) => {
      testReg = instance
      return RecoveryManager.deployed()
    }).then((instance) => {
      recoveryManager = instance
      done()
    })
  })



  it('Correctly creates Identity and Recovery', (done) => {
    let log1
    let log2
    identityManager.CreateIdentity(user1, recoveryManager.address, {from: nobody}).then(tx => {
      log1 = tx.logs[0]
      assert.equal(log1.event, 'IdentityCreated', 'wrong event')
      assert.equal(log1.args.owner, user1, 'Owner key is set in event')
      assert.equal(log1.args.recoveryKey, recoveryManager.address, 'Recovery key is set in event')
      assert.equal(log1.args.creator, nobody, 'Creator is set in event')
      return recoveryManager.createRecovery(identityManager.address, log1.args.identity, delegates, {from: nobody})
    }).then(tx => {
      log2 = tx.logs[0]
      assert.equal(log2.event, 'RecoveryIdentityCreated', 'wrong event')
      assert.equal(log2.args.IdentityManager, identityManager.address, 'Correct identityManager is set in event')
      assert.equal(log2.args.identity, log1.args.identity, 'Correct identity is set in event')
      assert.equal(log2.args.initiatedBy, nobody, 'Creator is nobody in event')
      done()
    }).catch((error) => {
      console.log(error)
      done()
    })
  })

  describe('Allows identity recovery', () => {
    beforeEach(done => {
      identityManager.CreateIdentity(user1, recoveryManager.address, {from: nobody}).then(tx => {
        let log = tx.logs[0]
        assert.equal(log.event, 'IdentityCreated', 'wrong event')
        proxy = Proxy.at(log.args.identity)
        return recoveryManager.createRecovery(identityManager.address,
                                              log.args.identity,
                                              delegates, {from: nobody})
      }).then(tx => {
        let log = tx.logs[0]
        assert.equal(log.event, 'RecoveryIdentityCreated', 'wrong event')
        done()
      }).catch(e => {
        console.log(e)
        done()
      })
    })

    it('Allows delegate to vote', (done) => {
      recoveryManager.signUserChange(proxy.address, newRecoveryKey, {from: delegate1}).then(tx => {
        let log = tx.logs[0]
        assert.equal(log.event, 'SignUserChange', 'wrong event')
        assert.equal(log.args.identity, proxy.address, 'wrong proxy')
        assert.equal(log.args.initiatedBy, delegate1, 'wrong delegate voted')
        assert.equal(log.args.newKey, newRecoveryKey, 'wrong new recovery')
        //Code taken for identityManager.js ; testing to confirm delegate is still not owner
        let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
        identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: newRecoveryKey}).then(() => {
          assert.isNotOk(true, 'This should have thrown an error in contract')
          done()
        }).catch((error) => {
          assert.match(error, /invalid JUMP/, 'throws an error')
          done()
        })
      })
    })

    it('Doesnt allow non-delegates to vote', (done) => {
      recoveryManager.signUserChange(proxy.address, newRecoveryKey, {from: nobody}).then(() => {
        assert.isNotOk(true, 'This should have thrown an error in contract')
        done()
      }).catch((error) => {
        assert.match(error, /invalid JUMP/, 'throws an error')
        done()
      })
    })

    it('Allows multiple delegates to vote', (done) => {
      recoveryManager.signUserChange(proxy.address, newRecoveryKey, {from: delegate1}).then(tx => {
        let log = tx.logs[0]
        assert.equal(log.event, 'SignUserChange', 'wrong event')
        assert.equal(log.args.identity, proxy.address, 'wrong proxy')
        assert.equal(log.args.initiatedBy, delegate1, 'wrong delegate voted')
        assert.equal(log.args.newKey, newRecoveryKey, 'wrong new recovery')
        return recoveryManager.signUserChange(proxy.address, newRecoveryKey, {from: delegate2})
      }).then(tx => {
        let log = tx.logs[0]
        assert.equal(log.event, 'SignUserChange', 'wrong event')
        assert.equal(log.args.identity, proxy.address, 'wrong proxy')
        assert.equal(log.args.initiatedBy, delegate2, 'wrong delegate voted')
        assert.equal(log.args.newKey, newRecoveryKey, 'wrong new recovery')
        evm_increaseTime(userTimeLock) //increase time until, if new owner was added, would be active
      }).then(() => {
        let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
        identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: newRecoveryKey}).then(() => {
          assert.isNotOk(true, 'This should have thrown an error in contract')
          done()
        }).catch((error) => {
          assert.match(error, /invalid JUMP/, 'throws an error')
          done()
        })
      })
    })

    it('changes user key when enough delegates have voted', (done) => {
      recoveryManager.signUserChange(proxy.address, newRecoveryKey, {from: delegate1}).then(tx => {
        let log = tx.logs[0]
        assert.equal(log.event, 'SignUserChange', 'wrong event')
        assert.equal(log.args.identity, proxy.address, 'wrong proxy')
        assert.equal(log.args.initiatedBy, delegate1, 'wrong delegate voted')
        assert.equal(log.args.newKey, newRecoveryKey, 'wrong new recovery')
        return recoveryManager.signUserChange(proxy.address, newRecoveryKey, {from: delegate2})
      }).then(tx => {
        let log = tx.logs[0]
        assert.equal(log.event, 'SignUserChange', 'wrong event')
        assert.equal(log.args.identity, proxy.address, 'wrong proxy')
        assert.equal(log.args.initiatedBy, delegate2, 'wrong delegate voted')
        assert.equal(log.args.newKey, newRecoveryKey, 'wrong new recovery')
        return recoveryManager.signUserChange(proxy.address, newRecoveryKey, {from: delegate3})
      }).then(tx => {
        let log = tx.logs[0]
        assert.equal(log.event, 'SignUserChange', 'wrong event')
        assert.equal(log.args.identity, proxy.address, 'wrong proxy')
        assert.equal(log.args.initiatedBy, delegate3, 'wrong delegate voted')
        assert.equal(log.args.newKey, newRecoveryKey, 'wrong new recovery')
        evm_increaseTime(userTimeLock)
      }).then(() => {
        let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
        identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: newRecoveryKey}).then((tx) => {
          // Verify that the proxy address is logged as the sender
          return testReg.registry.call(proxy.address)
        }).then((regData) => {
          assert.equal(regData.toNumber(), LOG_NUMBER_1, 'newRecoveryKey should be able to send transaction')
          done()
        }).catch(done)
      })
    })

    it('Should allow update when multiple keys being voted on', (done) => {
      recoveryManager.signUserChange(proxy.address, newRecoveryKey, {from: delegate1}).then(() => {
        return recoveryManager.signUserChange(proxy.address, newRecoveryKey, {from: delegate2})
      }).then(() => {
        //one of the delegates votes for someone else
        return recoveryManager.signUserChange(proxy.address, nobody, {from: delegate3})
      }).then(() => {
        //another delegate changes a vote
        return recoveryManager.signUserChange(proxy.address, nobody, {from: delegate4})
      }).then(() => {
        return recoveryManager.signUserChange(proxy.address, newRecoveryKey, {from: delegate3})
      }).then(() => {
        evm_increaseTime(userTimeLock)
      }).then(() => {
        let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
        identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: newRecoveryKey}).then((tx) => {
          // Verify that the proxy address is logged as the sender
          return testReg.registry.call(proxy.address)
        }).then((regData) => {
          assert.equal(regData.toNumber(), LOG_NUMBER_1, 'newRecoveryKey should be able to send transaction')
          done()
        }).catch(done)
      })
    })




    it('should return the correct delegates', (done) => {
      recoveryManager.getAddresses.call(proxy.address).then((addresses) => {
        assert.deepEqual(delegates, addresses, 'wrong delegates in contract')
        done()
      })
    })

    it('should return the correct number of signatures', (done) => {
      recoveryManager.collectedSignatures.call(proxy.address, newRecoveryKey).then((numSig) => {
        assert.equal(numSig, 0, 'should be zero signatures')
        return recoveryManager.signUserChange(proxy.address, newRecoveryKey, {from: delegate1})
      }).then(() => {
        return recoveryManager.collectedSignatures.call(proxy.address, newRecoveryKey)
      }).then(numSig => {
        assert.equal(numSig.toNumber(), 1, 'one delegate should have signed')
        //same delegate signing again should not change number of signatures
        return recoveryManager.signUserChange(proxy.address, newRecoveryKey, {from: delegate1})
      }).then(() => {
        return recoveryManager.collectedSignatures.call(proxy.address, newRecoveryKey)
      }).then(numSig => {
        assert.equal(numSig.toNumber(), 1, 'still, one delegate should have signed')
        //changing vote should change the number of delegates voting for address
        return recoveryManager.signUserChange(proxy.address, nobody, {from: delegate1})
      }).then(() => {
        return recoveryManager.collectedSignatures.call(proxy.address, newRecoveryKey)
      }).then(numSig => {
        assert.equal(numSig.toNumber(), 0, 'delegate vote didn\'t update')
        return recoveryManager.signUserChange(proxy.address, nobody, {from: delegate2})
      }).then(() => {
        return recoveryManager.collectedSignatures.call(proxy.address, nobody)
      }).then((numSig) => {
        assert.equal(numSig.toNumber(), 2, 'two delegates have signed')
        //if 3 of 4 delegates sign, should update owner, and clear all votes from delegates
        return recoveryManager.signUserChange(proxy.address, nobody, {from: delegate3})
      }).then(tx => {
        let log = tx.logs[1]
        assert.equal(log.event, 'ChangeUserKey', 'wrong event')
        assert.equal(log.args.identity, proxy.address, 'wrong proxy')
        assert.equal(log.args.initiatedBy, delegate3, 'wrong delegate voted')
        assert.equal(log.args.newKey, nobody, 'wrong new recovery')
        return recoveryManager.collectedSignatures.call(proxy.address, nobody)
      }).then(numSig => {
        assert.equal(numSig.toNumber(), 0, 'should delete signatures after key change')
        done()
      })
    })

    it('should not overwrite existing owner', (done) => {
      recoveryManager.signUserChange(proxy.address, user1, {from: delegate1}).then(tx => {
        //don't check logs - tests to redundant. Maybe I should?
        return recoveryManager.signUserChange(proxy.address, user1, {from: delegate2})
      }).then(tx => {
        return recoveryManager.signUserChange(proxy.address, user1, {from: delegate3})
      }).then(() => {
        assert.isNotOk(true, 'This should have thrown an error in contract')
        done()
      }).catch((error) => {
        //not sure why this is different than above, w/ invalid jump vs
        assert.match(error, /out of gas/, 'throws an error')
        done()
      })
    })
  })
})
