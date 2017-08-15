const lightwallet = require('eth-signer')
const evm_increaseTime = require('./evmIncreaseTime.js')
const snapshots = require('./evmSnapshots.js')
const MetaIdentityManager = artifacts.require('MetaIdentityManager')
const Proxy = artifacts.require('Proxy')
const TestRegistry = artifacts.require('TestRegistry')
const Promise = require('bluebird')
const compareCode = require('./compareCode')
web3.eth = Promise.promisifyAll(web3.eth)

const LOG_NUMBER_1 = 1234
const LOG_NUMBER_2 = 2345
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const userTimeLock = 100;
const adminTimeLock = 1000;
const adminRate = 200;

function getRandomNumber() {
  return Math.floor(Math.random() * (1000000 - 1)) + 1;
}

//From is who is actually signing. claimedFrom is the address that they claim to be (first input to most functions)
async function testForwardTo(testReg, identityManager, proxyAddress, fromAccount, claimedFrom, shouldEqual) {
  let errorThrown = false
  let testNum = getRandomNumber()
  // Encode the transaction to send to the proxy contract
  let data = lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [testNum])
  // Send forward request from the owner
  try {
    await identityManager.forwardTo(claimedFrom, proxyAddress, testReg.address, 0, '0x' + data, {from: fromAccount})
  } catch (e) {
    errorThrown = e.message
  }
  let regData = await testReg.registry.call(proxyAddress)
  if (shouldEqual) {
    assert.isNotOk(errorThrown, 'An error should not have been thrown')
    assert.equal(regData.toNumber(), testNum)
  } else {
    assert.match(errorThrown, /invalid opcode/, 'throws an error')
    assert.notEqual(regData.toNumber(), testNum)
  }
}

async function testForwardToFromRelay(testReg, identityManager, proxyAddress, fromAccount, txRelayAddress, shouldEqual) {
  let errorThrown = false
  let testNum = getRandomNumber()
  // Encode the transaction to send to the proxy contract
  let data = lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [testNum])
  // Send forward request from the owner
  try {
    await identityManager.forwardTo(fromAccount, proxyAddress, testReg.address, 0, '0x' + data, {from: txRelayAddress})
  } catch (e) {
    errorThrown = e.message
  }
  let regData = await testReg.registry.call(proxyAddress)
  if (shouldEqual) {
    assert.isNotOk(errorThrown, 'An error should not have been thrown')
    assert.equal(regData.toNumber(), testNum)
  } else {
    assert.match(errorThrown, /invalid opcode/, 'throws an error')
    assert.notEqual(regData.toNumber(), testNum)
  }
}


contract('MetaIdentityManager', (accounts) => {
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
  let relay

  let recoveryKey
  let recoveryKey2

  let snapshotId

  before(async function() {
    // Truffle deploys contracts with accounts[0]
    user1 = accounts[0]
    nobody = accounts[1] // has no authority
    user2 = accounts[2]
    user3 = accounts[3]
    user4 = accounts[4]
    user5 = accounts[5]
    relay = accounts[6]
    recoveryKey = accounts[8]
    recoveryKey2 = accounts[9]
    identityManager = await MetaIdentityManager.new(userTimeLock, adminTimeLock, adminRate, relay)
    deployedProxy = await Proxy.new({from: user1})
    testReg = await TestRegistry.new({from: user1})
  })

  it('Correctly creates Identity', async function() {
    let tx = await identityManager.createIdentity(user1, recoveryKey, {from: nobody})
    let log = tx.logs[0]

    assert.equal(log.event, 'IdentityCreated', 'wrong event')
    assert.equal(log.args.owner, user1, 'Owner key is set in event')
    assert.equal(log.args.recoveryKey, recoveryKey, 'Recovery key is set in event')
    assert.equal(log.args.creator, nobody, 'Creator is set in event')

    await compareCode(log.args.identity, deployedProxy.address)
    let proxyOwner = await Proxy.at(log.args.identity).owner.call()
    assert.equal(proxyOwner, identityManager.address, 'Proxy owner should be the identity manager')
  })

  describe('existing identity', () => {

    beforeEach(async function() {
      let tx = await identityManager.createIdentity(user1, recoveryKey, {from: nobody})
      let log = tx.logs[0]
      assert.equal(log.event, 'IdentityCreated', 'wrong event')
      proxy = Proxy.at(log.args.identity)
    })

    it('allow transactions initiated by owner', async function() {
      await testForwardTo(testReg, identityManager, proxy.address, user1, user1, true)
    })

    it('don\'t allow transactions initiated by non owner', async function() {
      await testForwardTo(testReg, identityManager, proxy.address, user2, user2, false)
    })

    it('don\'t allow transactions initiated by recoveryKey', async function() {
      await testForwardTo(testReg, identityManager, proxy.address, recoveryKey, recoveryKey, false)
    })

    it('onlyAuthorized modifier allows in correct users/relay', async function() {
      //Allow a user claimed to be themselves
      await testForwardTo(testReg, identityManager, proxy.address, user1, user1, true)
      //Do not allow a user claiming to be someone else.
      let errorThrown = false
      try {
        await testForwardTo(testReg, identityManager, proxy.address, user2, user1, true)
      } catch (e) {
        assert.match(e.message, /invalid opcode/, "Should have thrown")
        errorThrown = true
      }
      assert.isTrue(errorThrown, "should have thrown an error")
      //Allow the transaction relay.
      await testForwardToFromRelay(testReg, identityManager, proxy.address, user1, relay, true)
    })

    it('owner can add other owner', async function() {
      let isOwner = await identityManager.isOwner(proxy.address, user5, {from: user1})
      assert.isFalse(isOwner, 'user5 should not be owner yet')
      let tx = await identityManager.addOwner(user1, proxy.address, user5, {from: user1})
      let log = tx.logs[0]
      assert.equal(log.event, 'OwnerAdded', 'should trigger correct event')
      assert.equal(log.args.identity,
                  proxy.address,
                  'event should be for correct proxy')
      assert.equal(log.args.owner,
                  user5,
                  'Owner key is set in event')
      assert.equal(log.args.instigator,
                  user1,
                  'Instigator key is set in event')
      isOwner = await identityManager.isOwner(proxy.address, user5, {from: user1})
      assert.isTrue(isOwner, 'user5 should be owner now')
    })

    it('owner is rateLimited on some functions', async function() {
      //User1 adds user5
      let tx = await identityManager.addOwner(user1, proxy.address, user5, {from: user1})
      let log = tx.logs[0]
      assert.equal(log.event, 'OwnerAdded', 'should trigger correct event') //tests for correctness elsewhere
      //User1 try to add another owner, should fail.
      let errorThrown = false
      try {
        await identityManager.addOwner(user1, proxy.address, user4, {from: user1})
      } catch (e) {
        assert.match(e.message, /invalid opcode/, "should have thrown")
        errorThrown = true
      }
      assert.isTrue(errorThrown, "should have thrown")
      //User1 try to remove a user. Should still be rate limited and fail.
      errorThrown = false
      try {
        await identityManager.removeOwner(user1, proxy.address, user5, {from: user1})
      } catch (e) {
        assert.match(e.message, /invalid opcode/, "should have thrown")
        errorThrown = true
      }
      assert.isTrue(errorThrown, "should have thrown")
      //user1 tries to change recovery, but is still rate limited
      errorThrown = false
      try {
        await identityManager.changeRecovery(user1, proxy.address, recoveryKey2, {from: user1})
      } catch (e) {
        assert.match(e.message, /invalid opcode/, "should have thrown")
        errorThrown = true
      }
      assert.isTrue(errorThrown, "should have thrown")
      //No longer rateLimited
      await evm_increaseTime(adminTimeLock + 1)
      //User1 tries to add another owner. Should be able to
      tx = await identityManager.addOwner(user1, proxy.address, user4, {from: user1})
      log = tx.logs[0]
      assert.equal(log.event, 'OwnerAdded', 'should trigger correct event') //tests for correctness elsewhere
      //User1 try to remove a user. Should be rate limited and fail.
      errorThrown = false
      try {
        await identityManager.removeOwner(user1, proxy.address, user5, {from: user1})
      } catch (e) {
        assert.match(e.message, /invalid opcode/, "should have thrown")
        errorThrown = true
      }
      assert.isTrue(errorThrown, "should have thrown")
      //user1 tries to change recovery, but is still rate limited
      errorThrown = false
      try {
        await identityManager.changeRecovery(user1, proxy.address, recoveryKey2, {from: user1})
      } catch (e) {
        assert.match(e.message, /invalid opcode/, "should have thrown")
        errorThrown = true
      }
      assert.isTrue(errorThrown, "should have thrown")
      //no longer rateLimited
      await evm_increaseTime(adminTimeLock + 1)
      tx = await identityManager.removeOwner(user1, proxy.address, user5, {from: user1})
      log = tx.logs[0]
      assert.equal(log.event, 'OwnerRemoved', 'should trigger correct event')
      //user1 tries to change recovery, but is rate limited
      errorThrown = false
      try {
        await identityManager.changeRecovery(user1, proxy.address, recoveryKey2, {from: user1})
      } catch (e) {
        assert.match(e.message, /invalid opcode/, "should have thrown")
        errorThrown = true
      }
      assert.isTrue(errorThrown, "should have thrown")
      //no longer rateLimited
      await evm_increaseTime(adminTimeLock + 1)
      tx = await identityManager.changeRecovery(user1, proxy.address, recoveryKey2, {from: user1})
      log = tx.logs[0]
      assert.equal(log.event, 'RecoveryChanged', 'should trigger correct event')
    })

    it('non-owner can not add other owner', async function() {
      errorThrown = false
      try {
        await identityManager.addOwner(user3, proxy.address, user4, {from: user3})
      } catch(e) {
        assert.match(e.message, /invalid opcode/, 'throws an error')
        errorThrown = true
      }
      assert.isTrue(errorThrown, "should have thrown")
    })

    describe('new owner added by owner', () => {
      beforeEach(async function() {
        await identityManager.addOwner(user1, proxy.address, user2, {from: user1})
        errorThrown = false
      })

      it('is an owner but not olderOwner', async function() {
        let isOwner = await identityManager.isOwner.call(proxy.address, user2)
        assert.isTrue(isOwner, "should be an owner")
        let isOlderOwner = await identityManager.isOlderOwner.call(proxy.address, user2)
        assert.isFalse(isOlderOwner, "should not be an olderOwner")
      })

      it('Allow transactions', async function() {
        await testForwardTo(testReg, identityManager, proxy.address, user2, user2, true)
      })

      it('can not add other owner yet', async function() {
        let errorThrown = false
        try {
          let temp = await identityManager.addOwner(user2, proxy.address, user4, {from: user2})
          console.log(temp)
        } catch(e) {
          assert.match(e.message, /invalid opcode/, 'throws an error')
          errorThrown = true
        }
        assert.isTrue(errorThrown, 'Should have thrown')
      })

      it('can not remove other owner yet', async function() {
        let errorThrown = false
        try {
          await identityManager.removeOwner(user2, proxy.address, user1, {from: user2})
        } catch(e) {
          assert.match(e.message, /invalid opcode/, 'throws an error')
          errorThrown = true
        }
        assert.isTrue(errorThrown, 'Should have thrown')
      })

      it('can not change recoveryKey yet', async function() {
        let errorThrown = false
        try {
          await identityManager.changeRecovery(user2, proxy.address, recoveryKey2, {from: user2})
        } catch(e) {
          assert.match(e.message, /invalid opcode/, 'throws an error')
          errorThrown = true
        }
        assert.isTrue(errorThrown, 'Should have thrown')
      })

      describe('after adminTimeLock', () => {
        beforeEach(async function () {
          await evm_increaseTime(adminTimeLock)
          // a tx needs to be sent in order for the evm_increaseTime to have effect for eth_calls
          await web3.eth.sendTransactionAsync({to: user1, from: user2, value: 1})
        })

        it('is olderOwner', async function() {
          //send a transaction before, just to make sure that the evm increases time properly
          let tx = await identityManager.removeOwner(user2, proxy.address, user1, {from: user2})

          let isOwner = await identityManager.isOwner(proxy.address, user2)
          assert.isTrue(isOwner, "should be an owner")
          let isOlderOwner = await identityManager.isOlderOwner.call(proxy.address, user2)
          assert.isTrue(isOlderOwner, "should be an olderOwner")
        })

        it('can add new owner', async function() {
          let tx = await identityManager.addOwner(user2, proxy.address, user3, {from: user2})
          const log = tx.logs[0]

          assert.equal(log.args.owner,
                      user3,
                      'Owner key is set in event')
          assert.equal(log.args.instigator,
                      user2,
                      'Instigator key is set in event')
        })

        it('can remove other owner', async function() {
          let tx = await identityManager.removeOwner(user2, proxy.address, user1, {from: user2})
          const log = tx.logs[0]
          assert.equal(log.args.owner,
                      user1,
                      'Owner key is set in event')
          assert.equal(log.args.instigator,
                      user2,
                      'Instigator key is set in event')
        })

        it('can change recoveryKey', async function() {
          let isRecovery = await identityManager.isRecovery(proxy.address, recoveryKey2, {from: user1})
          assert.isFalse(isRecovery, 'recoveryKey2 should not be recovery yet')
          let tx = await identityManager.changeRecovery(user2, proxy.address, recoveryKey2, {from: user2})
          const log = tx.logs[0]
          assert.equal(log.args.recoveryKey,
                      recoveryKey2,
                      'recoveryKey key is set in event')
          assert.equal(log.args.instigator,
                      user2,
                      'Instigator key is set in event')
          isRecovery = await identityManager.isRecovery(proxy.address, recoveryKey2, {from: user1})
          assert.isTrue(isRecovery, 'recoveryKey2 should be recovery now')
        })

        it('should throw if recoveryKey is set to zero address', async function() {
          let errorThrown = false
          try {
            await identityManager.changeRecovery(user2, proxy.address, ZERO_ADDRESS, {from: user2})
          } catch (e) {
            assert.match(e.message, /invalid opcode/, "should have thrown")
            errorThrown = true
          }
          assert.isTrue(errorThrown, "should have thrown")
        })
      })
    })

    describe('new owner added by recoveryKey', () => {
      beforeEach(async function() {
        await identityManager.addOwnerFromRecovery(recoveryKey, proxy.address, user2, {from: recoveryKey})
      })

      it('recoveryKey is rate limited in added new owners', async function() {
        //should be rate limited when trying again
        let errorThrown = false
        try {
          await identityManager.addOwnerFromRecovery(recoveryKey, proxy.address, user4, {from: recoveryKey})
        } catch (e) {
          assert.match(e.message, /invalid opcode/, "should have thrown")
          errorThrown = true
        }
        assert.isTrue(errorThrown, "should have thrown")
        //should no longer be rateLimited
        await evm_increaseTime(adminTimeLock + 1)
        tx = await identityManager.addOwnerFromRecovery(recoveryKey, proxy.address, user4, {from: recoveryKey})
        assert.equal(tx.logs[0].event, 'OwnerAdded', 'should trigger correct event')
      })

      it('within userTimeLock is not allowed transactions', async function() {
        await testForwardTo(testReg, identityManager, proxy.address, user2, user2, false)
      })

      describe('after userTimeLock', () => {
        beforeEach(async function () {await evm_increaseTime(userTimeLock)})

        it('Allow transactions', async function() {
          await testForwardTo(testReg, identityManager, proxy.address, user2, user2, true)
        })
      })

      describe('after adminTimeLock', () => {
        beforeEach(async function () {await evm_increaseTime(adminTimeLock)})

        it('can add new owner', async function() {
          let tx = await identityManager.addOwner(user2, proxy.address, user3, {from: user2})
          const log = tx.logs[0]
          assert.equal(log.args.owner,
                      user3,
                      'Owner key is set in event')
          assert.equal(log.args.instigator,
                      user2,
                      'Instigator key is set in event')
        })

        it('can remove other owner', async function() {
          let tx = await identityManager.removeOwner(user2, proxy.address, user1, {from: user2})
          const log = tx.logs[0]
          assert.equal(log.args.owner,
                      user1,
                      'Owner key is set in event')
          assert.equal(log.args.instigator,
                      user2,
                      'Instigator key is set in event')
        })

        it('can change recoveryKey', async function() {
          let tx = await identityManager.changeRecovery(user2, proxy.address, recoveryKey2, {from: user2})
          const log = tx.logs[0]
          assert.equal(log.args.recoveryKey,
                      recoveryKey2,
                      'recoveryKey key is set in event')
          assert.equal(log.args.instigator,
                      user2,
                      'Instigator key is set in event')
        })
      })

      it('incorrect recoveryKey should throw', async function() {
        let errorThrown = false
        try {
          await identityManager.addOwnerFromRecovery(nobody, proxy.address, user4, {from: nobody})
        } catch (e) {
          assert.match(e.message, /invalid opcode/, "should have thrown")
          errorThrown = true
        }
        assert.isTrue(errorThrown, "should have thrown")
      })

      it('should throw if new owner is already an owner', async function() {
        await evm_increaseTime(adminTimeLock + 1)
        let errorThrown = false
        try {
          await identityManager.addOwnerFromRecovery(recoveryKey, proxy.address, user2, {from: recoveryKey})
        } catch (e) {
          assert.match(e.message, /invalid opcode/, "should have thrown")
          errorThrown = true
        }
        assert.isTrue(errorThrown, "should have thrown")
      })
    })
  })

  describe('migration', () => {
    let newIdenManager
    beforeEach(async function() {
      let tx = await identityManager.createIdentity(user1, recoveryKey, {from: nobody})
      let log = tx.logs[0]
      assert.equal(log.event, 'IdentityCreated', 'wrong event')
      proxy = Proxy.at(log.args.identity)
      newIdenManager = await MetaIdentityManager.new(userTimeLock, adminTimeLock, adminRate, relay)
      //user2 is now a younger owner, while user1 is an olderowner
      tx = await identityManager.addOwner(user1, proxy.address, user2, {from: user1})
      log = tx.logs[0]
      assert.equal(log.event, 'OwnerAdded', 'wrong event')
      assert.equal(log.args.identity, proxy.address, 'wrong proxy')
      assert.equal(log.args.owner, user2, 'wrong owner added')
      assert.equal(log.args.instigator, user1, 'wrong initiator')
    })

    it('older owner can start transfer', async function() {
      let tx = await identityManager.initiateMigration(user1, proxy.address, newIdenManager.address, {from: user1})
      let log = tx.logs[0]
      assert.equal(log.event, 'MigrationInitiated', 'wrong event initiated')
      assert.equal(log.args.identity, proxy.address, 'migrating wrong proxy')
      assert.equal(log.args.newIdManager, newIdenManager.address, 'migrating to wrong location')
      assert.equal(log.args.instigator, user1, 'migrating to wrong location')
    })

    it('young owner should not be able to start transfer', async function() {
      let threwError = false
      try {
        await identityManager.initiateMigration(user2, proxy.address, newIdenManager.address, {from: user2})
      } catch(e) {
        assert.match(e.message, /invalid opcode/, 'throws an error')
        threwError = true
      }
      assert.isTrue(threwError, 'Should have thrown an error here')
    })

    it('non-owner should not be able to start transfer' , async function() {
      let threwError = false
      try {
        await identityManager.initiateMigration(nobody, proxy.address, newIdenManager.address, {from: nobody})
      } catch(e) {
        assert.match(e.message, /invalid opcode/, 'throws an error')
        threwError = true
      }
      assert.isTrue(threwError, 'Should have thrown an error here')
    })

    it('correct keys can cancel migration', async function() {
      let tx = await identityManager.initiateMigration(user1, proxy.address, newIdenManager.address, {from: user1})
      let log = tx.logs[0]
      assert.equal(log.event, 'MigrationInitiated', 'wrong event initiated')
      assert.equal(log.args.identity, proxy.address, 'migrating wrong proxy')
      assert.equal(log.args.newIdManager, newIdenManager.address, 'migrating to wrong location')
      assert.equal(log.args.instigator, user1, 'started migrating from wrong user')

      tx = await identityManager.cancelMigration(user1, proxy.address, {from: user1})
      log = tx.logs[0]
      assert.equal(log.event, 'MigrationCanceled', 'wrong event initiated')
      assert.equal(log.args.identity, proxy.address, 'canceled migrating wrong proxy')
      assert.equal(log.args.newIdManager, newIdenManager.address, 'canceled migration to wrong location')
      assert.equal(log.args.instigator, user1, 'canceled migrating from wrong user')

      //set up migration again
      tx = await identityManager.initiateMigration(user1, proxy.address, newIdenManager.address, {from: user1})
      //Second migration attempt, should allow
      log = tx.logs[0]
      assert.equal(log.event, 'MigrationInitiated', 'wrong event initiated')
      assert.equal(log.args.identity, proxy.address, 'migrating wrong proxy')
      assert.equal(log.args.newIdManager, newIdenManager.address, 'migrating to wrong location')
      assert.equal(log.args.instigator, user1, 'started migrating from wrong person')

      await evm_increaseTime(userTimeLock)
      tx = await identityManager.cancelMigration(user2, proxy.address, {from: user2})
      //young owner should also be able to cancel migration
      log = tx.logs[0]
      assert.equal(log.event, 'MigrationCanceled', 'wrong event initiated')
      assert.equal(log.args.identity, proxy.address, 'canceled migrating wrong proxy')
      assert.equal(log.args.newIdManager, newIdenManager.address, 'canceled migration to wrong location')
      assert.equal(log.args.instigator, user2, 'canceled migrating from wrong person')

      await identityManager.initiateMigration(user1, proxy.address, newIdenManager.address, {from: user1})
      //Don't need to check setup again
      let threwError = false
      try {
        await identityManager.cancelMigration(nobody, proxy.address, {from: nobody})
      } catch(e) {
        assert.match(e.message, /invalid opcode/, 'throws an error')
        threwError = true
      }
      assert.isTrue(threwError, 'Should have thrown error')
    })

    it('should return correct address for finalization', async function () {
      await identityManager.initiateMigration(user1, proxy.address, newIdenManager.address, {from: user1})
      let newAdd = await identityManager.migrationNewAddress.call(proxy.address)
      assert.equal(newAdd, newIdenManager.address, "should be migration to new identityManager")
    })

    it('correct keys should finilize transfer', async function() {
      await identityManager.initiateMigration(user1, proxy.address, newIdenManager.address, {from: user1})
      let threwError = false
      try {
          await identityManager.finalizeMigration(nobody, proxy.address, {from: nobody})
      } catch(e) {
        assert.match(e.message, /invalid opcode/, 'throws an error')
        threwError = true
      }
      assert.isTrue(threwError, 'non-owner should not be able to finalize')
      threwError = false
      try {
          await identityManager.finalizeMigration(user2, proxy.address, {from: user2})
      } catch(e) {
        assert.match(e.message, /invalid opcode/, 'throws an error')
        threwError = true
      }
      assert.isTrue(threwError, 'young owner should not be able to finalize')

      //correct owner should not be able to finalize before time is up
      threwError = false
      try {
          await identityManager.finalizeMigration(user1, proxy.address, {from: user1})
      } catch(e) {
        assert.match(e.message, /invalid opcode/, 'throws an error')
        threwError = true
      }
      assert.isTrue(threwError, 'young owner should not be able to finalize')


      await evm_increaseTime(2 * adminTimeLock)
      let tx = await identityManager.finalizeMigration(user1, proxy.address, {from: user1})
      let log = tx.logs[0]
      assert.equal(log.event, 'MigrationFinalized', 'wrong event initiated')
      assert.equal(log.args.identity, proxy.address, 'finalized migrating wrong proxy')
      assert.equal(log.args.newIdManager, newIdenManager.address, 'finalized migration to wrong location')
      assert.equal(log.args.instigator, user1, 'finalized migrating from wrong person')
    })

    it('should be owner of new identityManager after successful transfer', async function() {
      await identityManager.initiateMigration(user1, proxy.address, newIdenManager.address, {from: user1})
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('registerIdentity', ['address', 'address'], [user1, recoveryKey])
      await identityManager.forwardTo(user1, proxy.address, newIdenManager.address, 0, data, {from: user1})
      //increase time until migration can be finialized
      await evm_increaseTime(2 * adminTimeLock)
      let tx = await identityManager.finalizeMigration(user1, proxy.address, newIdenManager.address, {from: user1})
      let log = tx.logs[0]
      assert.equal(log.event, 'MigrationFinalized', 'wrong event initiated')
      assert.equal(log.args.identity, proxy.address, 'finalized migrating wrong proxy')
      assert.equal(log.args.newIdManager, newIdenManager.address, 'finalized migration to wrong location')
      assert.equal(log.args.instigator, user1, 'finalized migrating from wrong user')
      data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
      await newIdenManager.forwardTo(user1, proxy.address, testReg.address, 0, data, {from: user1})
      // Verify that the proxy address is logged as the sender
      let regData = await testReg.registry.call(proxy.address)
        assert.equal(regData.toNumber(), LOG_NUMBER_1, 'User1 should be able to send transaction from new contract')
    })

    it('should throw if trying to register an existing proxy', async function() {
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('registerIdentity', ['address', 'address'], [user1, recoveryKey])
      try {
        await identityManager.forwardTo(user1, proxy.address, identityManager.address, 0, data, {from: user1})
      } catch(e) {
        assert.match(e.message, /invalid opcode/, 'throws an error')
        threwError = true
      }
      assert.isTrue(threwError, 'existing proxy should not be able to re-register')
    })
  })
})
