const IdentityFactoryWithRecoveryKey = artifacts.require('IdentityFactoryWithRecoveryKey')
const Proxy = artifacts.require('Proxy')
const RecoverableController = artifacts.require('RecoverableController')
const compareCode = require('./compareCode')

contract('IdentityFactoryWithRecoveryKey', (accounts) => {
  let proxy
  let deployedProxy
  let deployedRecoverableController
  let recoverableController
  let identityFactoryWithRecoveryKey
  let user1
  let nobody

  let proxyAddress
  let recoverableControllerAddress
  let recoveryKey

  let shortTimeLock = 2
  let longTimeLock = 7

  before(async function() {
    // Truffle deploys contracts with accounts[0]
    user1 = accounts[0]
    nobody = accounts[1] // has no authority
    recoveryKey = accounts[4]

    identityFactoryWithRecoveryKey = await IdentityFactoryWithRecoveryKey.deployed()
    deployedProxy = await Proxy.new({from: accounts[0]})
    deployedRecoverableController = await RecoverableController.new({from: accounts[0]})
  })

  it('Correctly creates proxy and controller', async function() {
    let tx = await identityFactoryWithRecoveryKey.CreateProxyWithControllerAndRecoveryKey(user1, recoveryKey, longTimeLock, shortTimeLock, {from: nobody})
    let log=tx.logs[0];
    assert.equal(log.event,"IdentityCreated","wrong event");
    proxyAddress = log.args.proxy
    recoverableControllerAddress = log.args.controller
    recoveryQuorumAddress = log.args.recoveryQuorum

    proxy = Proxy.at(proxyAddress)
    recoverableController = RecoverableController.at(recoverableControllerAddress)
    //await compareCode(proxyAddress, deployedProxy.address)
    //await compareCode(recoverableControllerAddress, deployedRecoverableController.address)
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
    let rk = await recoverableController.recoveryKey()
    assert.equal(rk, recoveryKey)
  })
})
