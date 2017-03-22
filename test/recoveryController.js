const lightwallet = require('eth-signer')
const wait = require('./wait.js')
const Proxy = artifacts.require('Proxy')
const TestRegistry = artifacts.require('TestRegistry')
const RecoverableController = artifacts.require('RecoverableController')

const LOG_NUMBER_1 = 1234
const LOG_NUMBER_2 = 2345

contract('RecoverableController', (accounts) => {
  let recoverableController
  let testReg
  let proxy
  let user1
  let user2
  let user3
  let admin1
  let admin2
  let admin3
  let nobody
  let shortTime = 2 // seconds
  let longTime = 4

  before(() => {
    user1 = accounts[0]
    user2 = accounts[1]
    user3 = accounts[2]
    admin1 = accounts[3]
    admin2 = accounts[4]
    admin3 = accounts[5]
    nobody = accounts[6]
    // Truffle deploys contracts with accounts[0]
    Proxy.deployed().then((instance) => {
      proxy = instance
      return TestRegistry.deployed()
    }).then((instance) => {
      testReg = instance
    })
  })

  it('Correctly deploys contract', (done) => {
    RecoverableController.new(proxy.address, user1, longTime, shortTime).then((newOWA) => {
      recoverableController = newOWA
      recoverableController.proxy().then((proxyAddress) => {
        assert.equal(proxyAddress, proxy.address)
        return recoverableController.userKey()
      }).then((userKey) => {
        assert.equal(userKey, user1)
        return recoverableController.changeRecoveryFromRecovery(admin1)
      }).then(() => {
        return recoverableController.recoveryKey()
      }).then((recoveryKey) => {
        assert.equal(recoveryKey, admin1)
        done()
      }).catch(done)
    })
  })

  it('Only sends transactions from correct user', (done) => {
    // Transfer ownership of proxy to the controller contract.
    proxy.transfer(recoverableController.address, {from: user1}).then(() => {
      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
      return recoverableController.forward(testReg.address, 0, data, {from: user1})
    }).then(() => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_1, 'User1 should be able to send transaction')

      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
      return recoverableController.forward(testReg.address, 0, data, {from: user2})
    }).then(() => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.notEqual(regData.toNumber(), LOG_NUMBER_2, 'User2 should not be able to send transaction')
      done()
    }).catch(done)
  })

  it('Updates userKey as user', (done) => { // userkey is currently user1
    recoverableController.signUserKeyChange(user2, {from: user2}).then(() => {
      return recoverableController.proposedUserKey()
    }).then((proposedUserKey) => {
      assert.equal(proposedUserKey, 0x0, 'Only user can set the proposedUserKey')
      return recoverableController.signUserKeyChange(user2, {from: user1})
    }).then(() => {
      return recoverableController.proposedUserKey()
    }).then((proposedUserKey) => {
      assert.equal(proposedUserKey, user2, 'New user key should now be cued up')
      return recoverableController.userKey()
    }).then((userKey) => {
      assert.equal(userKey, user1, 'UserKey should not change until changeUserKey is called')
      return recoverableController.changeUserKey({from: nobody})
    }).then(() => {
      return wait(shortTime + 1)
    }).then(() => {
      return recoverableController.userKey()
    }).then((userKey) => {
      assert.equal(userKey, user1, 'Should still not have changed user key unless changeUserKey is called after shortTimeLock period')
      return recoverableController.changeUserKey({from: nobody})
    }).then(() => {
      return recoverableController.userKey()
    }).then((userKey) => {
      assert.equal(userKey, user2, 'ChangeUserKey Should affect userKey after shortTimeLock period')
      done()
    }).catch(done)
  })

  it('Updates userKey as recovery', (done) => { // userkey is currently user2
    recoverableController.changeUserKeyFromRecovery(user3, {from: user2}).then(() => {
      return recoverableController.userKey()
    }).then((userKey) => {
      assert.equal(userKey, user2, 'Only user can call changeUserKeyFromRecovery')
      return recoverableController.changeUserKeyFromRecovery(user3, {from: admin1})
    }).then(() => {
      return recoverableController.userKey()
    }).then((userKey) => {
      assert.equal(user3, user3, 'New user should immediately take affect')
      done()
    }).catch(done)
  })

  it('Updates recovery as user', (done) => { // userkey is currently user3
    recoverableController.signRecoveryChange(admin2, {from: admin1}).then(() => {
      return recoverableController.proposedRecoveryKey()
    }).then((proposedRecoveryKey) => {
      assert.equal(proposedRecoveryKey, 0x0, 'Only user can call signRecoveryChange')
      return recoverableController.signRecoveryChange(admin2, {from: user3})
    }).then(() => {
      return recoverableController.proposedRecoveryKey()
    }).then((proposedRecoveryKey) => {
      assert.equal(proposedRecoveryKey, admin2, 'New recovery key should now be cued up')
      return recoverableController.recoveryKey()
    }).then((recoveryKey) => {
      assert.equal(recoveryKey, admin1, 'recovery key should not change until changeRecovery is called')
      return recoverableController.changeRecovery({from: nobody})
    }).then(() => {
      return wait(longTime + 1)
    }).then(() => {
      return recoverableController.recoveryKey()
    }).then((recoveryKey) => {
      assert.equal(recoveryKey, admin1, 'Should still not have changed recovery key unless changeRecovery is called after longTimeLock period')
      return recoverableController.changeRecovery({from: nobody})
    }).then(() => {
      return recoverableController.recoveryKey()
    }).then((recoveryKey) => {
      assert.equal(recoveryKey, admin2, 'ChangeRecovery Should affect recoveryKey after longTimeLock period')
      done()
    }).catch(done)
  })

  it('Updates recoveryKey as recovery', (done) => { // recoveryKey is currently admin2
    recoverableController.changeRecoveryFromRecovery(admin3, {from: user3}).then(() => {
      return recoverableController.recoveryKey()
    }).then((recoveryKey) => {
      assert.equal(recoveryKey, admin2, 'Only recovery key can call changeRecoveryFromRecovery')
      return recoverableController.changeRecoveryFromRecovery(admin3, {from: admin2})
    }).then(() => {
      return recoverableController.recoveryKey()
    }).then((recoveryKey) => {
      assert.equal(recoveryKey, admin3, 'New recoveryKey should immediately take affect')
      done()
    }).catch(done)
  })

  it('Correctly performs transfer', (done) => { // userKey is currently user3
    recoverableController.signControllerChange(user1, {from: admin1}).then(() => {
      return recoverableController.proposedController()
    }).then((proposedController) => {
      assert.equal(proposedController, 0x0, 'Only user can set the proposedController')
      return recoverableController.signControllerChange(user1, {from: user3})
    }).then(() => {
      return recoverableController.proposedController()
    }).then((proposedController) => {
      assert.equal(proposedController, user1, 'New controller should now be cued up')
      return proxy.owner()
    }).then((proxyOwner) => {
      assert.equal(proxyOwner, recoverableController.address, 'proxy should not change until changeController is called')
      return recoverableController.changeController({from: nobody})
    }).then(() => {
      return wait(longTime + 1)
    }).then(() => {
      return proxy.owner()
    }).then((proxyOwner) => {
      assert.equal(proxyOwner, recoverableController.address, 'Should still not have changed controller unless changeController is called after longTimeLock period')
      return recoverableController.changeController({from: nobody})
    }).then(() => {
      return proxy.owner()
    }).then((proxyOwner) => {
      assert.equal(proxyOwner, user1, 'ChangeController Should affect proxy ownership after longTimeLock period')
      done()
    }).catch(done)
  })
})
