const evm_increaseTime = require('./evmIncreaseTime.js')
const Proxy = artifacts.require('Proxy')
const RecoverableController = artifacts.require('RecoverableController')
const RecoveryQuorum = artifacts.require('RecoveryQuorum')
const Promise = require('bluebird')
web3.eth = Promise.promisifyAll(web3.eth)

contract('RecoveryQuorum', (accounts) => {
  let recoverableController
  let recoveryQuorum
  let proxy
  let user1
  let user2
  let recovery1
  let delegateList
  let largeDelegateList

  let delegateDeletedAfter = 0
  let delegatePendingUntil = 1
  let delegateProposedUserKey = 2

  let creationTime = Date.now()/1000
  let shortTimeLock = 900 // 15 minutes
  let longTimeLock = 604800 // 1 week

  before(async function() {
    user1 = accounts[0]
    user2 = accounts[1]
    recovery1 = accounts[2]
    delegateList = [
      accounts[3],
      accounts[4],
      accounts[5],
      accounts[6]
    ]
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
      accounts[15]
    ]
    proxy = await Proxy.new({from: accounts[0]})
  })

  it('Correctly deploys contract', async function() {
    recoverableController = await RecoverableController.new(proxy.address, user1, longTimeLock, shortTimeLock, {from: recovery1})
    let block = await web3.eth.getBlockAsync("latest")
    creationTime = block.timestamp
    await proxy.transfer(recoverableController.address, {from: accounts[0]})
    recoveryQuorum = await RecoveryQuorum.new(recoverableController.address, delegateList)
    await recoverableController.changeRecoveryFromRecovery(recoveryQuorum.address, {from: recovery1})
    let RCrecoveryKey = await recoverableController.recoveryKey.call()
    assert.equal(RCrecoveryKey, recoveryQuorum.address, 'Controllers recoverKey should be the RQs address')

    let RCcontroller = await recoveryQuorum.controller.call()
    assert.equal(RCcontroller, recoverableController.address, 'RQs controller var should be the controllers address')

    let controllerAddress = await recoveryQuorum.controller()
    assert.equal(controllerAddress, recoverableController.address)
    let delegate = await recoveryQuorum.delegates.call(delegateList[0])
    assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0)

    delegate = await recoveryQuorum.delegates.call(delegateList[1])
    assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0)

    delegate = await recoveryQuorum.delegates.call(delegateList[2])
    assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0)

    delegate = await recoveryQuorum.delegates.call(delegateList[3])
    assert.equal(delegate[delegateProposedUserKey], 0x0)
    assert.equal(delegate[delegatePendingUntil].toNumber(), 0)
    assert.isAtLeast(delegate[delegateDeletedAfter].toNumber(), 31536000000000) // million years

    delegate = await recoveryQuorum.delegates.call(user1)
    assert.equal(delegate[delegateDeletedAfter].toNumber(), 0)

    delegate = await recoveryQuorum.delegates.call(user2)
    assert.equal(delegate[delegateDeletedAfter].toNumber(), 0)

    delegate = await recoveryQuorum.delegates.call(recovery1)
    assert.equal(delegate[delegateDeletedAfter].toNumber(), 0)

    delegate = await recoveryQuorum.delegates.call(0x0)
    assert.equal(delegate[delegateDeletedAfter].toNumber(), 0)
  })

  it('Non-delegate can not sign recovery', async function() {
    await recoveryQuorum.signUserChange(user2, {from: user1})
    let collectedSignatures = await recoveryQuorum.collectedSignatures.call(user2)
    assert.equal(collectedSignatures.toNumber(), 0, 'only delegates should be able to add to the number of collectedSigs.')
  })

  it('delegate can sign recovery', async function() {
    await recoveryQuorum.signUserChange(user2, {from: delegateList[0]})
    let collectedSignatures = await recoveryQuorum.collectedSignatures.call(user2)
    assert.equal(collectedSignatures.toNumber(), 1, 'Authorized delegate should add to the number of collectedSigs.')
  })

  it('delegate can not sign recovery twice', async function() {
    await recoveryQuorum.signUserChange(user2, {from: delegateList[0]})
    let collectedSignatures = await recoveryQuorum.collectedSignatures.call(user2)
    assert.equal(collectedSignatures.toNumber(), 1, 'Delegate that already sign should not be able to sign again')
  })

  it('Insufficient signatures can not recover controller user key', async function() {
    let collectedSignatures = await recoveryQuorum.collectedSignatures.call(user2)
    assert.equal(collectedSignatures.toNumber(), 1, 'should keep track of how many votes user2 has (1)')
    await recoveryQuorum.changeUserKey(user2, {from: delegateList[0]})
    let userKey = await recoverableController.userKey.call()
    assert.equal(userKey, user1, 'User key in controller should not have changed.')

    collectedSignatures = await recoveryQuorum.collectedSignatures.call(user2)
    assert.equal(collectedSignatures.toNumber(), 1, 'should not have changed since called previously')
  })

  it('Enough signatures can recover controller user key', async function() {
    await recoveryQuorum.signUserChange(user2, {from: delegateList[1]})
    await recoveryQuorum.signUserChange(user2, {from: delegateList[2]})
    let collectedSigs = await recoveryQuorum.collectedSignatures.call(user2)
    assert.equal(collectedSigs.toNumber(), 0, 'collected sigs should e reset after changeUserKey')

    let userKey = await recoverableController.userKey.call()
    assert.equal(userKey, user2, 'User key in controller should have been updated.')

    let delegate = await recoveryQuorum.delegates.call(user1)
    assert.equal(delegate[delegateProposedUserKey], 0x0, 'Signatures should reset after a user key recovery')

    delegate = await recoveryQuorum.delegates.call(user2)
    assert.equal(delegate[delegateProposedUserKey], 0x0, 'Signatures should reset after a user key recovery')

    delegate = await recoveryQuorum.delegates.call(delegateList[0])
    assert.equal(delegate[delegateProposedUserKey], 0x0, 'Signatures should reset after a user key recovery')

    delegate = await recoveryQuorum.delegates.call(delegateList[1])
    assert.equal(delegate[delegateProposedUserKey], 0x0, 'Signatures should reset after a user key recovery')

    let addys = await recoveryQuorum.getAddresses.call()
    assert.equal(addys.length, 4)

    let collectedSignatures = await recoveryQuorum.collectedSignatures.call(user2)
    assert.equal(collectedSignatures, 0, 'Signatures should have reset after a user key recovery')
  })

  it('Only controller user can add delegates to quorum', async function() {
    await web3.eth.sendTransactionAsync({from: accounts[0], to: user2, value: web3.toWei('10', 'ether')})
    proxy = await Proxy.new({from: accounts[0]})
    recoverableController = await RecoverableController.new(proxy.address, user2, longTimeLock, shortTimeLock, {from: recovery1})
    await proxy.transfer(recoverableController.address, {from: accounts[0]})
    recoveryQuorum = await RecoveryQuorum.new(recoverableController.address, delegateList)
    await recoverableController.changeRecoveryFromRecovery(recoveryQuorum.address, {from: recovery1})
    await recoveryQuorum.replaceDelegates([], [accounts[7]], {from: user1})
    let delegate = await recoveryQuorum.delegates.call(accounts[7])
    assert.equal(delegate[delegateDeletedAfter].toNumber(), 0, 'Random user should not be able to add additional delegates to quorum.')

    await recoveryQuorum.replaceDelegates([], [accounts[7]], {from: user2})
    delegate = await recoveryQuorum.delegates.call(accounts[7])
    assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0, 'Controller userKey should be able to add additional delegates to quorum.')
    assert.approximately(delegate[delegatePendingUntil].toNumber(), creationTime + longTimeLock, 5)

    await recoveryQuorum.signUserChange(0x123, {from: delegateList[1]})
    delegate = await recoveryQuorum.delegates.call(delegateList[1])
    assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0, 'This delegate exists from contract creation')
    assert.equal(delegate[delegateProposedUserKey], 0x0123)
    assert.equal(delegate[delegatePendingUntil].toNumber(), 0)
    assert.isAtLeast(delegate[delegateDeletedAfter].toNumber(), 31536000000000, 'inits to 1million years')

    await recoveryQuorum.replaceDelegates([], [delegateList[1]], {from: user2})
    delegate = await recoveryQuorum.delegates.call(delegateList[1])
    assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0, 'Trying to add existing delegate should affect nothing')
    assert.equal(delegate[delegateProposedUserKey], 0x0123, 'Trying to add existing delegate should affect nothing')
    assert.equal(delegate[delegatePendingUntil].toNumber(), 0, 'Trying to add existing delegate should affect nothing')
    assert.isAtLeast(delegate[delegateDeletedAfter].toNumber(), 31536000000000, 'Trying to add existing delegate should affect nothing')

    await recoveryQuorum.replaceDelegates([accounts[3], accounts[4]], [], {from: user2})
    await evm_increaseTime(longTimeLock + 1)
    await recoveryQuorum.replaceDelegates([], [accounts[4]], {from: user2})
    let delegateAddresses = await recoveryQuorum.getAddresses.call()
    assert.deepEqual(delegateAddresses, [accounts[7], accounts[6], accounts[5], accounts[4]])

    await recoveryQuorum.replaceDelegates([], [accounts[3]], {from: user2})
    await evm_increaseTime(longTimeLock + 1)
    delegateAddresses = await recoveryQuorum.getAddresses.call()
    assert.deepEqual(delegateAddresses, [accounts[7], accounts[6], accounts[5], accounts[4], accounts[3]])
  })

  it('Newly added delegates signature should not count towards quorum yet', async function() {
    await recoveryQuorum.replaceDelegates([], [accounts[8]], {from: user2})
    let block = await web3.eth.getBlockAsync("latest")
    creationTime = block.timestamp
    let delegate = await recoveryQuorum.delegates.call(accounts[8])
    assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0, 'New delegate should have been added by user')
    assert.equal(delegate[delegateProposedUserKey], 0x0)
    assert.approximately(delegate[delegatePendingUntil].toNumber(), creationTime + longTimeLock, 5)

    delegate = await recoveryQuorum.delegates.call(accounts[7])
    assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0, 'New delegate should have been added by user')
    assert.equal(delegate[delegateProposedUserKey], 0x0)

    let collectedSignatures = await recoveryQuorum.collectedSignatures.call(user2)
    assert.equal(collectedSignatures, 0, 'Signatures should have reset after a user key recovery')

    await recoveryQuorum.signUserChange(user1, {from: accounts[8]})
    collectedSignatures = await recoveryQuorum.collectedSignatures.call(user1)
    assert.equal(collectedSignatures, 0, 'Newly added delegates should not be able to add valid signature yet')

    await recoveryQuorum.signUserChange(user1, {from: accounts[7]})
    delegate = await recoveryQuorum.delegates.call(accounts[7])
    assert.equal(delegate[delegateProposedUserKey], user1, 'Proposed user should be set')

    await recoveryQuorum.changeUserKey(user1, {from: accounts[7]})
    let userKey = await recoverableController.userKey.call()
    assert.equal(userKey, user2, 'controller userKey should not change because these delegates are too new')
  })

  it('Allows you to remove a delegate, and add them back many times', async function() {
    proxy = await Proxy.new({from: accounts[0]})
    recoverableController = await RecoverableController.new(proxy.address, user2, shortTimeLock, longTimeLock, {from: recovery1})
    await proxy.transfer(recoverableController.address, {from: accounts[0]})
    recoveryQuorum = await RecoveryQuorum.new(recoverableController.address, delegateList) // init with delegates
    await recoverableController.changeRecoveryFromRecovery(recoveryQuorum.address, {from: recovery1})
    let delegateAddresses = await recoveryQuorum.getAddresses()
    assert.deepEqual(delegateAddresses, delegateList, 'starts with delegates')

    await recoveryQuorum.replaceDelegates(delegateList, [], {from: user2}) // remove them all
    delegateAddresses = await recoveryQuorum.getAddresses()
    assert.deepEqual(delegateAddresses, delegateList, 'current delegates are still there, but deletion pending')

    await evm_increaseTime(longTimeLock + 1)
    await recoveryQuorum.replaceDelegates([], [], {from: user2}) // trigger garbageCollection
    delegateAddresses = await recoveryQuorum.getAddresses()
    assert.deepEqual(delegateAddresses, [], 'after waiting and garbageCollection they are gone')

    await recoveryQuorum.replaceDelegates([], delegateList, {from: user2}) // add them back
    delegateAddresses = await recoveryQuorum.getAddresses()
    assert.deepEqual(delegateAddresses, delegateList, 'immediately they are back')

    await recoveryQuorum.replaceDelegates([], delegateList, {from: user2}) // try to add them twice
    delegateAddresses = await recoveryQuorum.getAddresses()
    assert.deepEqual(delegateAddresses, delegateList, 'doubling up should change nothing')

    await recoveryQuorum.replaceDelegates(delegateList, [], {from: user2}) // remove them all again
    delegateAddresses = await recoveryQuorum.getAddresses()
    assert.deepEqual(delegateAddresses, [], 'pending delegates are deleted immediately')

    await recoveryQuorum.replaceDelegates([], largeDelegateList, {from: user2}) // add lots of new delegates
    delegateAddresses = await recoveryQuorum.getAddresses()
    assert.deepEqual(delegateAddresses, largeDelegateList, 'old delegates are gone, and the new ones are present')
  })

 //  THE FOLLOWING TESTS REQUIRE 25 ACCOUNTS: `testrpc --accounts 25`
 // =================================================================

  it('protected against gasLimit attack. WARNING: strange error if gas is overspent', async function() {
    proxy = await Proxy.new({from: accounts[0]})
    recoverableController = await RecoverableController.new(proxy.address, user2, 100000, 100000, {from: recovery1})
    await proxy.transfer(recoverableController.address, {from: accounts[0]})
    recoveryQuorum = await RecoveryQuorum.new(recoverableController.address, [accounts[1]]) // only 1 delegate
    await recoverableController.changeRecoveryFromRecovery(recoveryQuorum.address, {from: recovery1})
    await recoveryQuorum.replaceDelegates([accounts[1]], largeDelegateList, {from: user2}) // add 14 more
    await recoveryQuorum.replaceDelegates([], [accounts[16]], {from: user2}) // try adding 16th delegate
    await recoveryQuorum.signUserChange(0x123, {from: accounts[2]}) // add a vote or each $
    await recoveryQuorum.signUserChange(0x123, {from: accounts[3]})
    await recoveryQuorum.signUserChange(0x123, {from: accounts[4]})
    await recoveryQuorum.signUserChange(0x123, {from: accounts[5]})
    await recoveryQuorum.signUserChange(0x123, {from: accounts[6]})
    await recoveryQuorum.signUserChange(0x123, {from: accounts[7]})
    await recoveryQuorum.signUserChange(0x123, {from: accounts[8]})
    await recoveryQuorum.signUserChange(0x123, {from: accounts[9]})
    await recoveryQuorum.signUserChange(0x123, {from: accounts[10]})
    await recoveryQuorum.signUserChange(0x123, {from: accounts[11]})
    await recoveryQuorum.signUserChange(0x123, {from: accounts[12]})
    await recoveryQuorum.signUserChange(0x123, {from: accounts[13]})
    await recoveryQuorum.signUserChange(0x123, {from: accounts[14]})
    await recoveryQuorum.signUserChange(0x123, {from: accounts[15]})
    let delegate = await recoveryQuorum.delegates.call(accounts[1])
    assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0) // check state for OG delegate
    assert.equal(delegate[delegateProposedUserKey], 0x0)
    assert.equal(delegate[delegatePendingUntil].toNumber(), 0)
    assert.isAtLeast(delegate[delegateDeletedAfter].toNumber(), Date.now() / 1000) // million years

    let addys = await recoveryQuorum.getAddresses()
    assert.equal(addys.length, 15, 'only first 15 delegates made it in')

    delegate = await recoveryQuorum.delegates.call(accounts[2])
    assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0) // check state for a pending
    assert.equal(delegate[delegateProposedUserKey], 0x123)
    assert.isAtLeast(delegate[delegatePendingUntil].toNumber(), Date.now() / 1000 + 10000)
    assert.equal(delegate[delegateDeletedAfter].toNumber(), 31536000000000) // million years

    delegate = await recoveryQuorum.delegates.call(accounts[16])
    assert.equal(delegate[delegateDeletedAfter].toNumber(), 0) // 16th delegate shouldn't exist cause we are full
    assert.equal(delegate[delegateProposedUserKey], 0x0)

    await recoveryQuorum.signUserChange(0x123, {from: accounts[1], gas: 1000000})
    let userKey = await recoverableController.userKey()
    assert.equal(userKey, 0x123, 'enough gas was present to recover')
  })

  it('protected against gasLimit attack. WARNING: strange error if gas is overspent', async function() {
    proxy = await Proxy.new({from: accounts[0]})
    recoverableController = await RecoverableController.new(proxy.address, user2, 0, 0, {from: recovery1})
    await proxy.transfer(recoverableController.address, {from: accounts[0]})
    largeDelegateList.push(accounts[1])
    recoveryQuorum = await RecoveryQuorum.new(recoverableController.address, largeDelegateList) // full 15 delegates
    await recoverableController.changeRecoveryFromRecovery(recoveryQuorum.address, {from: recovery1})
    await recoveryQuorum.signUserChange(0x111, {from: accounts[1]})
    await recoveryQuorum.signUserChange(0x222, {from: accounts[2]})
    await recoveryQuorum.signUserChange(0x333, {from: accounts[3]})
    await recoveryQuorum.signUserChange(0x444, {from: accounts[4]})
    await recoveryQuorum.signUserChange(0x555, {from: accounts[5]})
    await recoveryQuorum.signUserChange(0x666, {from: accounts[6]})
    await recoveryQuorum.signUserChange(0x777, {from: accounts[7]})
    await recoveryQuorum.signUserChange(0x456, {from: accounts[8]})
    await recoveryQuorum.signUserChange(0x456, {from: accounts[9]})
    await recoveryQuorum.signUserChange(0x456, {from: accounts[10]})
    await recoveryQuorum.signUserChange(0x456, {from: accounts[11]})
    await recoveryQuorum.signUserChange(0x456, {from: accounts[12]})
    await recoveryQuorum.signUserChange(0x456, {from: accounts[13]})
    await recoveryQuorum.signUserChange(0x456, {from: accounts[14]})
    let addys = await recoveryQuorum.getAddresses()
    assert.equal(addys.length, 15, '15 delegates from contract creation')

    let delegate = await recoveryQuorum.delegates.call(accounts[1])
    assert.isAbove(delegate[delegateDeletedAfter].toNumber(), 0) // correct state for OG delegates
    assert.equal(delegate[delegateProposedUserKey], 0x111)
    assert.equal(delegate[delegatePendingUntil].toNumber(), 0)
    assert.isAtLeast(delegate[delegateDeletedAfter].toNumber(), Date.now() / 1000) // million years

    delegate = await recoveryQuorum.delegates.call(accounts[16])
    assert.equal(delegate[delegateDeletedAfter].toNumber(), 0) // 16th delegate shouldn't exist cause we are full
    assert.equal(delegate[delegateProposedUserKey], 0x0)

    await recoveryQuorum.signUserChange(0x456, {from: accounts[15], gas: 1000000})
    let userKey = await recoverableController.userKey()
    assert.equal(userKey, 0x456, 'enough gas was present to recover')
  })
})
