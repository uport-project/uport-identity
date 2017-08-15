const IdentityFactory = artifacts.require('IdentityFactory')
const Proxy = artifacts.require('Proxy')
const RecoverableController = artifacts.require('RecoverableController')
const RecoveryQuorum = artifacts.require('RecoveryQuorum')
const compareCode = require('./compareCode')

contract('IdentityFactory', (accounts) => {
  let identityFactory
  let proxy
  let recoveryQuorum
  let deployedProxy
  let deployedRecoverableController
  let deployedRecoveryQuorum
  let recoverableController
  let user1
  let delegate1
  let delegate2
  let delegate3
  let delegate4
  let delegates
  let nobody

  let proxyAddress
  let recoverableControllerAddress
  let recoveryQuorumAddress

  let shortTimeLock = 2
  let longTimeLock = 7

  before(async function() {
    // Truffle deploys contracts with accounts[0]
    user1 = accounts[0]
    nobody = accounts[1] // has no authority
    delegate1 = accounts[4]
    delegate2 = accounts[5]
    delegate3 = accounts[6]
    delegate4 = accounts[7]
    delegates = [delegate1, delegate2, delegate3, delegate4]

    identityFactory = await IdentityFactory.deployed()
    deployedProxy = await Proxy.new({from: accounts[0]})
    deployedRecoverableController = await RecoverableController.new({from: accounts[0]})
    deployedRecoveryQuorum = await RecoveryQuorum.new({from: accounts[0]})
  })

  it('Correctly creates proxy, controller, and recovery contracts', async function() {
    let tx = await identityFactory.CreateProxyWithControllerAndRecovery(user1, delegates, longTimeLock, shortTimeLock, {from: nobody})
    let log=tx.logs[0];
    assert.equal(log.event,"IdentityCreated","wrong event");
    proxyAddress = log.args.proxy
    recoverableControllerAddress = log.args.controller
    recoveryQuorumAddress = log.args.recoveryQuorum

    proxy = Proxy.at(proxyAddress)
    recoverableController = RecoverableController.at(recoverableControllerAddress)
    recoveryQuorum = RecoveryQuorum.at(recoveryQuorumAddress)
    //await compareCode(proxyAddress, deployedProxy.address)
    //await compareCode(recoverableControllerAddress, deployedRecoverableController.address)
    //await compareCode(recoveryQuorumAddress, deployedRecoveryQuorum.address)
  })

  it('Created proxy should have correct state', async function() {
    let createdControllerAddress = await proxy.owner.call()
    assert.equal(createdControllerAddress, recoverableController.address)
  })

  it('Created controller should have correct state', async function() {
    let _proxyAddress = await recoverableController.proxy()
    assert.equal(_proxyAddress, proxy.address)
    let userKey = await recoverableController.userKey()
    assert.equal(userKey, user1)
    let recoveryKey = await recoverableController.recoveryKey()
    assert.equal(recoveryKey, recoveryQuorumAddress)
  })

  it('Created recoveryQuorum should have correct state', async function() {
    let controllerAddress = await recoveryQuorum.controller()
    assert.equal(controllerAddress, recoverableController.address)
    let delegateAddresses = await recoveryQuorum.getAddresses()
    assert.deepEqual(delegateAddresses, delegates)
  })
})
