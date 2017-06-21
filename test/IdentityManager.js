const lightwallet = require('eth-signer')
const evm_increaseTime = require('./evmIncreaseTime.js')
const snapshots = require('./evmSnapshots.js')
const IdentityManager = artifacts.require('IdentityManager')
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

contract('IdentityManager', (accounts) => {
  let proxy
  let deployedProxy
  let testReg
  let identityManager
  let user1
  let user2
  let user3
  let user4
  let user5
  let nobody

  let recoveryKey
  let recoveryKey2

  let snapshotId

  before(done => {
    // Truffle deploys contracts with accounts[0]
    user1 = accounts[0]
    nobody = accounts[1] // has no authority
    user2 = accounts[2]
    user3 = accounts[3]
    user4 = accounts[4]
    user5 = accounts[5]
    recoveryKey = accounts[8]
    recoveryKey2 = accounts[9]
    IdentityManager.new(userTimeLock, adminTimeLock, adminRate).then((instance) => {
      identityManager = instance
      return Proxy.new({from: user1})
    }).then((instance) => {
      deployedProxy = instance
      return TestRegistry.deployed()
    }).then((instance) => {
      testReg = instance
    //   return snapshots.snapshot()
    // }).then(id => {
    //   snapshotId = id
      done()
    })
  })

  // afterEach(done => {
  //   snapshots.revert(snapshotId)
  //   done()
  // })

  it('Correctly creates Identity', (done) => {
    let log
    identityManager.CreateIdentity(user1, recoveryKey, {from: nobody}).then(tx => {
      log = tx.logs[0]
      assert.equal(log.event, 'IdentityCreated', 'wrong event')

      assert.equal(log.args.owner,
                   user1,
                   'Owner key is set in event')
      assert.equal(log.args.recoveryKey,
                   recoveryKey,
                   'Recovery key is set in event')
      assert.equal(log.args.creator,
                   nobody,
                   'Creator is set in event')

      return compareCode(log.args.identity, deployedProxy.address)
    }).then(() => {
      return Proxy.at(log.args.identity).owner.call()
    }).then((proxyOwner) => {
      assert.equal(proxyOwner, identityManager.address, 'Proxy owner should be the identity manager')
      done()
    }).catch((error) => {
      console.log(error)
      done()
    })
  })

  describe('existing identity', () => {
    beforeEach(done => {
      identityManager.CreateIdentity(user1, recoveryKey, {from: nobody}).then(tx => {
        // console.log(tx)
        const log = tx.logs[0]
        assert.equal(log.event, 'IdentityCreated', 'wrong event')
        proxy = Proxy.at(log.args.identity)
        done()
      }).catch(e => {
        console.log(e)
        done()
      })
    })

    it('allow transactions initiated by owner', (done) => {
      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
      identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user1}).then((tx) => {
        // Verify that the proxy address is logged as the sender
        return testReg.registry.call(proxy.address)
      }).then((regData) => {
        assert.equal(regData.toNumber(), LOG_NUMBER_1, 'User1 should be able to send transaction')
        done()
      }).catch(done)
    })

    it('don\'t allow transactions initiated by non owner', (done) => {
      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
      identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user2}).then(() => {
        assert.isNotOk(true, 'This should have thrown an error in contract')
        done()
      }).catch((error) => {
        assert.match(error, /invalid JUMP/, 'throws an error')
        done()
      })
    })

    it('don\'t allow transactions initiated by recoveryKey', (done) => {
      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
      identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: recoveryKey}).then(() => {
        assert.isNotOk(true, 'This should have thrown an error in contract')
        done()
      }).catch((error) => {
        assert.match(error, /invalid JUMP/, 'throws an error')
        done()
      })
    })

    it('owner can add other owner', (done) => {
      const event = identityManager.OwnerAdded({identity: proxy.address})
      event.watch((error, result) => {
        if (error) throw Error(error)
        event.stopWatching()
        assert.equal(result.args.owner,
                    user5,
                    'Owner key is set in event')
        assert.equal(result.args.instigator,
                    user1,
                    'Instigator key is set in event')
        done()
      })
      identityManager.addOwner(proxy.address, user5, {from: user1}).catch(error => {
        console.log(error)
        assert.isNotOk(error, 'there should nor be an error')
        done()
      })
    })

    it('non-owner can not add other owner', (done) => {
      identityManager.addOwner(proxy.address, user4, {from: user3}).catch((error) => {
        assert.match(error, /invalid JUMP/, 'throws an error')
        done()
      })
    })

    describe('new owner added by owner', () => {
      beforeEach(done => {
        identityManager.addOwner(proxy.address, user2, {from: user1}).then((tx) => {
          // console.log(tx)
          done()
        }).catch(error => {
          console.log(error)
          done()
        })
      })

      it('within userTimeLock is not allowed transactions', (done) => {
        // Encode the transaction to send to the Owner contract
        let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
        identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user2}).then(() => {
          assert.isNotOk(true, 'This should have thrown an error in contract')
          done()
        }).catch((error) => {
          assert.match(error, /invalid JUMP/, 'throws an error')
          done()
        })
      })

      describe('after userTimeLock', () => {
        beforeEach(() => evm_increaseTime(userTimeLock))
        it('Allow transactions', (done) => {
          // Encode the transaction to send to the Owner contract
          let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
          identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user2}).then((tx) => {
            // Verify that the proxy address is logged as the sender
            return testReg.registry.call(proxy.address)
          }).then((regData) => {
            assert.equal(regData.toNumber(), LOG_NUMBER_2, 'User2 should be able to send transaction')
            done()
          }).catch(done)
        })

        it('can not add other owner yet', (done) => {
          identityManager.addOwner(proxy.address, user4, {from: user2}).catch((error) => {
            assert.match(error, /invalid JUMP/, 'throws an error')
            done()
          })
        })

        it('can not remove other owner yet', (done) => {
          identityManager.removeOwner(proxy.address, user1, {from: user2}).catch((error) => {
            assert.match(error, /invalid JUMP/, 'throws an error')
            done()
          })
        })

        it('can not change recoveryKey yet', (done) => {
          identityManager.changeRecovery(proxy.address, recoveryKey2, {from: user2}).catch((error) => {
            assert.match(error, /invalid JUMP/, 'throws an error')
            done()
          })
        })
      })

      describe('after adminTimeLock', () => {
        beforeEach(() => evm_increaseTime(adminTimeLock))

        it('can add new owner', (done) => {
          identityManager.addOwner(proxy.address, user3, {from: user2}).then(tx => {
            const log = tx.logs[0]
            assert.equal(log.args.owner,
                        user3,
                        'Owner key is set in event')
            assert.equal(log.args.instigator,
                        user2,
                        'Instigator key is set in event')
            done()
          }).catch(error => {
            console.log(error)
            done()
          })
        })

        it('can remove other owner yet', (done) => {
          identityManager.removeOwner(proxy.address, user1, {from: user2}).then(tx => {
            const log = tx.logs[0]
            assert.equal(log.args.owner,
                        user1,
                        'Owner key is set in event')
            assert.equal(log.args.instigator,
                        user2,
                        'Instigator key is set in event')
            done()
          }).catch(error => {
            console.log(error)
            done()
          })
        })

        it('can change recoveryKey yet', (done) => {
          identityManager.changeRecovery(proxy.address, recoveryKey2, {from: user2}).then(tx => {
            const log = tx.logs[0]
            assert.equal(log.args.recoveryKey,
                        recoveryKey2,
                        'recoveryKey key is set in event')
            assert.equal(log.args.instigator,
                        user2,
                        'Instigator key is set in event')
            done()
          }).catch(error => {
            console.log(error)
            done()
          })
        })
      })
    })

    describe('new owner added by recoveryKey', () => {
      beforeEach(done => {
        identityManager.addOwnerFromRecovery(proxy.address, user2, {from: recoveryKey}).then((tx) => {
          // console.log(tx)
          done()
        }).catch(error => {
          console.log(error)
          done()
        })
      })

      it('within userTimeLock is not allowed transactions', (done) => {
        // Encode the transaction to send to the Owner contract
        let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
        identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user2}).then(() => {
          assert.isNotOk(true, 'This should have thrown an error in contract')
          done()
        }).catch((error) => {
          assert.match(error, /invalid JUMP/, 'throws an error')
          done()
        })
      })

      describe('after userTimeLock', () => {
        beforeEach(() => evm_increaseTime(userTimeLock))
        it('Allow transactions', (done) => {
          // Encode the transaction to send to the Owner contract
          let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
          identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user2}).then((tx) => {
            // Verify that the proxy address is logged as the sender
            return testReg.registry.call(proxy.address)
          }).then((regData) => {
            assert.equal(regData.toNumber(), LOG_NUMBER_2, 'User2 should be able to send transaction')
            done()
          }).catch(done)
        })

        it('can not add other owner yet', (done) => {
          identityManager.addOwner(proxy.address, user4, {from: user2}).catch((error) => {
            assert.match(error, /invalid JUMP/, 'throws an error')
            done()
          })
        })

        it('can not remove other owner yet', (done) => {
          identityManager.removeOwner(proxy.address, user1, {from: user2}).catch((error) => {
            assert.match(error, /invalid JUMP/, 'throws an error')
            done()
          })
        })

        it('can not change recoveryKey yet', (done) => {
          identityManager.changeRecovery(proxy.address, recoveryKey2, {from: user2}).catch((error) => {
            assert.match(error, /invalid JUMP/, 'throws an error')
            done()
          })
        })
      })

      describe('after adminTimeLock', () => {
        beforeEach(() => evm_increaseTime(adminTimeLock))

        it('can add new owner', (done) => {
          identityManager.addOwner(proxy.address, user3, {from: user2}).then(tx => {
            const log = tx.logs[0]
            assert.equal(log.args.owner,
                        user3,
                        'Owner key is set in event')
            assert.equal(log.args.instigator,
                        user2,
                        'Instigator key is set in event')
            done()
          }).catch(error => {
            console.log(error)
            done()
          })
        })

        it('can remove other owner', (done) => {
          identityManager.removeOwner(proxy.address, user1, {from: user2}).then(tx => {
            const log = tx.logs[0]
            assert.equal(log.args.owner,
                        user1,
                        'Owner key is set in event')
            assert.equal(log.args.instigator,
                        user2,
                        'Instigator key is set in event')
            done()
          }).catch(error => {
            console.log(error)
            done()
          })
        })

        it('can change recoveryKey', (done) => {
          identityManager.changeRecovery(proxy.address, recoveryKey2, {from: user2}).then(tx => {
            const log = tx.logs[0]
            assert.equal(log.args.recoveryKey,
                        recoveryKey2,
                        'recoveryKey key is set in event')
            assert.equal(log.args.instigator,
                        user2,
                        'Instigator key is set in event')
            done()
          }).catch(error => {
            console.log(error)
            done()
          })
        })
      })
    })
  })
  describe('migration', () => {
    let newIdenManager
    beforeEach(done => {
      identityManager.CreateIdentity(user1, recoveryKey, {from: nobody}).then(tx => {
        const log = tx.logs[0]
        assert.equal(log.event, 'IdentityCreated', 'wrong event')
        proxy = Proxy.at(log.args.identity)
        return IdentityManager.new(userTimeLock, adminTimeLock, adminRate)
      }).then((instance) => {
        newIdenManager = instance
        //user2 is now a younger owner, while user1 is an olderowner
        return identityManager.addOwner(proxy.address, user2)
      }).then(tx => {
        let log = tx.logs[0]
        assert.equal(log.event, 'OwnerAdded', 'wrong event')
        assert.equal(log.args.identity, proxy.address, 'wrong proxy')
        assert.equal(log.args.owner, user2, 'wrong owner added')
        assert.equal(log.args.instigator, user1, 'wrong initiator')
        done()
      }).catch(done)
    })

    it('correct keys can start transfer', (done) => {
      //olderOwner should be able to start transfer
      identityManager.initiateMigration(proxy.address, newIdenManager.address, {from: user1}).then(tx => {
        let log = tx.logs[0]
        assert.equal(log.event, 'MigrationInitiated', 'wrong event initiated')
        assert.equal(log.args.identity, proxy.address, 'migrating wrong proxy')
        assert.equal(log.args.newIdManager, newIdenManager.address, 'migrating to wrong location')
        assert.equal(log.args.instigator, user1, 'migrating to wrong location')
        //young owner should not be able to start transfer
        return identityManager.initiateMigration(proxy.address, newIdenManager.address, {from: user2})
      }).then(tx => {
        assert.isFalse(true, 'Should have thrown an error here')
      }).catch((error) => {
        assert.isTrue(error.toString().indexOf("invalid JUMP") != -1, 'Should have thrown, did not')
      }).then(() => {
        //non-owner should not be able to start transfer
        return identityManager.initiateMigration(proxy.address, newIdenManager.address, {from: nobody})
      }).then(() => {
        assert.isFalse(true, 'Should have thrown an error here')
      }).catch((error) => {
        assert.isTrue(error.toString().indexOf("invalid JUMP") != -1, 'Should have thrown, did not')
        done()
      })
    })

    it('correct keys can cancel migration', (done) => {
      identityManager.initiateMigration(proxy.address, newIdenManager.address, {from: user1}).then(tx => {
        let log = tx.logs[0]
        assert.equal(log.event, 'MigrationInitiated', 'wrong event initiated')
        assert.equal(log.args.identity, proxy.address, 'migrating wrong proxy')
        assert.equal(log.args.newIdManager, newIdenManager.address, 'migrating to wrong location')
        assert.equal(log.args.instigator, user1, 'started migrating from wrong user')
        return identityManager.cancelMigration(proxy.address, {from: user1})
      }).then(tx => {
        let log = tx.logs[0]
        assert.equal(log.event, 'MigrationCanceled', 'wrong event initiated')
        assert.equal(log.args.identity, proxy.address, 'canceled migrating wrong proxy')
        assert.equal(log.args.newIdManager, newIdenManager.address, 'canceled migration to wrong location')
        assert.equal(log.args.instigator, user1, 'canceled migrating from wrong user')
        //set up migration again
        return identityManager.initiateMigration(proxy.address, newIdenManager.address, {from: user1})
      }).then(tx => {
        //Second migration attempt, should allow
        let log = tx.logs[0]
        assert.equal(log.event, 'MigrationInitiated', 'wrong event initiated')
        assert.equal(log.args.identity, proxy.address, 'migrating wrong proxy')
        assert.equal(log.args.newIdManager, newIdenManager.address, 'migrating to wrong location')
        assert.equal(log.args.instigator, user1, 'started migrating from wrong person')
        return identityManager.cancelMigration(proxy.address, {from: user2})
      }).then(tx => {
        //young owner should also be able to cancel migration
        let log = tx.logs[0]
        assert.equal(log.event, 'MigrationCanceled', 'wrong event initiated')
        assert.equal(log.args.identity, proxy.address, 'canceled migrating wrong proxy')
        assert.equal(log.args.newIdManager, newIdenManager.address, 'canceled migration to wrong location')
        assert.equal(log.args.instigator, user2, 'canceled migrating from wrong person')
        return identityManager.initiateMigration(proxy.address, newIdenManager.address, {from: user1})
      }).then(() => {
        //Don't need to check setup again
        return identityManager.cancelMigration(proxy.address, {from: nobody})
      }).then(tx => {
        assert.isFalse(true, 'Should have thrown error')
      }).catch(error => {
        assert.isTrue(error.toString().indexOf("invalid JUMP") != -1, 'Should have thrown, did not')
      }).then(() => {
        done()
      })
    })

    it('correct keys should finilize transfer', (done) => {
      identityManager.initiateMigration(proxy.address, newIdenManager.address, {from: user1}).then(tx => {
        return identityManager.finalizeMigration(proxy.address, {from: nobody})
      }).then(() => {
        assert.isFalse(true, 'non-owner should not be able to finalize')
      }).catch(error => {
        assert.isTrue(error.toString().indexOf("invalid JUMP") != -1, 'should have thrown, did not')
        return identityManager.finalizeMigration(proxy.address, {from: user2})
      }).then(() => {
        assert.isFalse(true, 'young owner should not be able to finalize')
        //has to be greater than the adminTimeLock past to be finalized
      }).catch(error => {
        assert.isTrue(error.toString().indexOf("invalid JUMP") != -1, 'should have thrown, did not')
      }).then(() => {
        evm_increaseTime(2 * adminTimeLock)
      }).then(() => {
        return identityManager.finalizeMigration(proxy.address, {from: user1})
      }).then(tx => {
        //console.log(tx.recipt)
        let log = tx.logs[0]
        assert.equal(log.event, 'MigrationFinalized', 'wrong event initiated')
        assert.equal(log.args.identity, proxy.address, 'finalized migrating wrong proxy')
        assert.equal(log.args.newIdManager, newIdenManager.address, 'finalized migration to wrong location')
        assert.equal(log.args.instigator, user1, 'finalized migrating from wrong person')
      }).then(() => {
        done()
      })
    })

    it('should be owner of new identityManager after successful transfer', (done) => {
      identityManager.initiateMigration(proxy.address, newIdenManager.address, {from: user1}).then(tx => {
        let data = '0x' + lightwallet.txutils._encodeFunctionTxData('registerIdentity', ['address', 'address'], [user1, recoveryKey])
        return identityManager.forwardTo(proxy.address, newIdenManager.address, 0, data, {from: user1})
      }).then(() => {
        //increase time until migration can be finialized
        evm_increaseTime(2 * adminTimeLock)
      }).then(() => {
        return identityManager.finalizeMigration(proxy.address, newIdenManager.address, {from: user1})
      }).then(tx => {
        let log = tx.logs[0]
        assert.equal(log.event, 'MigrationFinalized', 'wrong event initiated')
        assert.equal(log.args.identity, proxy.address, 'finalized migrating wrong proxy')
        assert.equal(log.args.newIdManager, newIdenManager.address, 'finalized migration to wrong location')
        assert.equal(log.args.instigator, user1, 'finalized migrating from wrong user')
        let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
        return newIdenManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user1})
      }).then(tx => {
        // Verify that the proxy address is logged as the sender
        return testReg.registry.call(proxy.address)
      }).then((regData) => {
        assert.equal(regData.toNumber(), LOG_NUMBER_1, 'User1 should be able to send transaction from new contract')
        done()
      })
    })
  })
})
