const lightwallet = require('eth-signer')
const evm_increaseTime = require('./evmIncreaseTime.js')
const Proxy = artifacts.require('Proxy')
const TestRegistry = artifacts.require('TestRegistry')
const RecoverableController = artifacts.require('RecoverableController')
const Promise = require('bluebird')
web3.eth = Promise.promisifyAll(web3.eth)

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
  let creationTime = Date().now/1000;
  let shortTime = 900 // 15 minutes
  let longTime = 604800 // 1 week

  before(async function() {
    user1 = accounts[0]
    user2 = accounts[1]
    user3 = accounts[2]
    admin1 = accounts[3]
    admin2 = accounts[4]
    admin3 = accounts[5]
    nobody = accounts[6]
    // Truffle deploys contracts with accounts[0]
    proxy = await Proxy.new({from: accounts[0]})
    testReg = await TestRegistry.new({from: user1})
  })

  it('Correctly deploys contract', async function() {
    recoverableController = await RecoverableController.new(proxy.address, user1, longTime, shortTime)
    let proxyAddress = await recoverableController.proxy()
    assert.equal(proxyAddress, proxy.address)

    let block = await web3.eth.getBlockAsync("latest")
    creationTime = block.timstamp
    let userKey = await recoverableController.userKey()
    assert.equal(userKey, user1)

    await recoverableController.changeRecoveryFromRecovery(admin1)
    let recoveryKey = await recoverableController.recoveryKey()
    assert.equal(recoveryKey, admin1)
  })

  it('Only sends transactions from correct user', async function() {
    // Transfer ownership of proxy to the controller contract.
    await proxy.transfer(recoverableController.address, {from: user1})
    // Encode the transaction to send to the Owner contract
    let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
    await recoverableController.forward(testReg.address, 0, data, {from: user1})
    // Verify that the proxy address is logged as the sender
    let regData = await testReg.registry.call(proxy.address)
    assert.equal(regData.toNumber(), LOG_NUMBER_1, 'User1 should be able to send transaction')

    // Encode the transaction to send to the Owner contract
    data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
    await recoverableController.forward(testReg.address, 0, data, {from: user2})
    // Verify that the proxy address is logged as the sender
    regData = await testReg.registry.call(proxy.address)
    assert.notEqual(regData.toNumber(), LOG_NUMBER_2, 'User2 should not be able to send transaction')
  })

  it('Updates userKey as user', async function() { // userkey is currently user1
    await recoverableController.signUserKeyChange(user2, {from: user2})
    let proposedUserKey = await recoverableController.proposedUserKey()
    assert.equal(proposedUserKey, 0x0, 'Only user can set the proposedUserKey')

    await recoverableController.signUserKeyChange(user2, {from: user1})
    proposedUserKey = await recoverableController.proposedUserKey()
    assert.equal(proposedUserKey, user2, 'New user key should now be cued up')

    let userKey = await recoverableController.userKey()
    assert.equal(userKey, user1, 'UserKey should not change until changeUserKey is called')

    await recoverableController.changeUserKey({from: nobody})
    await evm_increaseTime(shortTime + 1)
    userKey = await recoverableController.userKey()
    assert.equal(userKey, user1, 'Should still not have changed user key unless changeUserKey is called after shortTimeLock period')

    await recoverableController.changeUserKey({from: nobody})
    userKey = await recoverableController.userKey()
    assert.equal(userKey, user2, 'ChangeUserKey Should affect userKey after shortTimeLock period')
  })

  it('Updates userKey as recovery', async function() { // userkey is currently user2
    await recoverableController.changeUserKeyFromRecovery(user3, {from: user2})
    let userKey = await recoverableController.userKey()
    assert.equal(userKey, user2, 'Only user can call changeUserKeyFromRecovery')

    await recoverableController.changeUserKeyFromRecovery(user3, {from: admin1})
    userKey = await recoverableController.userKey()
    assert.equal(user3, user3, 'New user should immediately take affect')
  })

  it('Updates recovery as user', async function() { // userkey is currently user3
    await recoverableController.signRecoveryChange(admin2, {from: admin1})
    let proposedRecoveryKey = await recoverableController.proposedRecoveryKey()
    assert.equal(proposedRecoveryKey, 0x0, 'Only user can call signRecoveryChange')

    await recoverableController.signRecoveryChange(admin2, {from: user3})
    proposedRecoveryKey = await recoverableController.proposedRecoveryKey()
    assert.equal(proposedRecoveryKey, admin2, 'New recovery key should now be cued up')

    let recoveryKey = await recoverableController.recoveryKey()
    assert.equal(recoveryKey, admin1, 'recovery key should not change until changeRecovery is called')

    await recoverableController.changeRecovery({from: nobody})
    await evm_increaseTime(longTime + 1)
    recoveryKey = await recoverableController.recoveryKey()
    assert.equal(recoveryKey, admin1, 'Should still not have changed recovery key unless changeRecovery is called after longTimeLock period')

    await recoverableController.changeRecovery({from: nobody})
    recoveryKey = await recoverableController.recoveryKey()
    assert.equal(recoveryKey, admin2, 'ChangeRecovery Should affect recoveryKey after longTimeLock period')
  })

  it('Updates recoveryKey as recovery', async function() { // recoveryKey is currently admin2
    await recoverableController.changeRecoveryFromRecovery(admin3, {from: user3})
    let recoveryKey = await recoverableController.recoveryKey()
    assert.equal(recoveryKey, admin2, 'Only recovery key can call changeRecoveryFromRecovery')

    await recoverableController.changeRecoveryFromRecovery(admin3, {from: admin2})
    recoveryKey = await recoverableController.recoveryKey()
    assert.equal(recoveryKey, admin3, 'New recoveryKey should immediately take affect')
  })

  it('Correctly performs transfer', async function() { // userKey is currently user3
    await recoverableController.signControllerChange(user1, {from: admin1})
    let proposedController = await recoverableController.proposedController()
    assert.equal(proposedController, 0x0, 'Only user can set the proposedController')

    await recoverableController.signControllerChange(user1, {from: user3})
    proposedController = await recoverableController.proposedController()
    assert.equal(proposedController, user1, 'New controller should now be cued up')

    let proxyOwner = await proxy.owner()
    assert.equal(proxyOwner, recoverableController.address, 'proxy should not change until changeController is called')

    await recoverableController.changeController({from: nobody})
    await evm_increaseTime(longTime + 1)
    proxyOwner = await proxy.owner()
    assert.equal(proxyOwner, recoverableController.address, 'Should still not have changed controller unless changeController is called after longTimeLock period')
    await recoverableController.changeController({from: nobody})
    proxyOwner = await proxy.owner()
    assert.equal(proxyOwner, user1, 'ChangeController Should affect proxy ownership after longTimeLock period')
  })
})
