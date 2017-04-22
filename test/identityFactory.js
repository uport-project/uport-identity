const IdentityFactory = artifacts.require('IdentityFactory')
const Proxy = artifacts.require('Proxy')
const RecoverableController = artifacts.require('RecoverableController')
const RecoveryQuorum = artifacts.require('RecoveryQuorum')
const Promise = require('bluebird')
const compareCode = require('./compareCode')
web3.eth = Promise.promisifyAll(web3.eth)


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

  before((done) => {
    // Truffle deploys contracts with accounts[0]
    user1 = accounts[0]
    nobody = accounts[1] // has no authority
    delegate1 = accounts[4]
    delegate2 = accounts[5]
    delegate3 = accounts[6]
    delegate4 = accounts[7]
    delegates = [delegate1, delegate2, delegate3, delegate4]

    IdentityFactory.deployed().then((instance) => {
      identityFactory = instance
      return Proxy.new({from: accounts[0]})
    }).then((instance) => {
      deployedProxy = instance
      return RecoverableController.new({from: accounts[0]})
    }).then((instance) => {
      deployedRecoverableController = instance
      return RecoveryQuorum.new({from: accounts[0]})
    }).then((instance) => {
      deployedRecoveryQuorum = instance
      done()
    })
  })

  it('Correctly creates proxy, controller, and recovery contracts', (done) => {
    identityFactory.CreateProxyWithControllerAndRecovery(user1, delegates, longTimeLock, shortTimeLock, {from: nobody})
    .then( (tx) => {
      let log=tx.logs[0];
      assert.equal(log.event,"IdentityCreated","wrong event");
      proxyAddress = log.args.proxy
      recoverableControllerAddress = log.args.controller
      recoveryQuorumAddress = log.args.recoveryQuorum

      proxy = Proxy.at(proxyAddress)
      recoverableController = RecoverableController.at(recoverableControllerAddress)
      recoveryQuorum = RecoveryQuorum.at(recoveryQuorumAddress)
      return compareCode(proxyAddress, deployedProxy.address)
    }).then(() => {
      return compareCode(recoverableControllerAddress, deployedRecoverableController.address)
    }).then(() => {
      return compareCode(recoveryQuorumAddress, deployedRecoveryQuorum.address)
    }).then(done).catch(done)
  })

  it('Created proxy should have correct state', (done) => {
    proxy.owner.call().then((createdControllerAddress) => {
      assert.equal(createdControllerAddress, recoverableController.address)
      done()
    }).catch(done)
  })

  it('Created controller should have correct state', (done) => {
    recoverableController.proxy().then((_proxyAddress) => {
      assert.equal(_proxyAddress, proxy.address)
      return recoverableController.userKey()
    }).then((userKey) => {
      assert.equal(userKey, user1)
      return recoverableController.recoveryKey()
    }).then((recoveryKey) => {
      assert.equal(recoveryKey, recoveryQuorumAddress)
      done()
    }).catch(done)
  })

  it('Created recoveryQuorum should have correct state', (done) => {
    recoveryQuorum.controller().then(controllerAddress => {
      assert.equal(controllerAddress, recoverableController.address)
      return recoveryQuorum.getAddresses()
    }).then(delegateAddresses => {
      assert.deepEqual(delegateAddresses, delegates)
      done()
    }).catch(done)
  })
})
