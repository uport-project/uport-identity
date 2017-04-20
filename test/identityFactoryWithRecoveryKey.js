const IdentityFactoryWithRecoveryKey = artifacts.require('IdentityFactoryWithRecoveryKey')
const Proxy = artifacts.require('Proxy')
const RecoverableController = artifacts.require('RecoverableController')
const Promise = require('bluebird')
web3.eth = Promise.promisifyAll(web3.eth)

function compareCode(addr1, addr2) {
  let c1, c2
  return new Promise((resolve, reject) => {
    web3.eth.getCodeAsync(addr1).then(code => {
      c1 = code
      return web3.eth.getCodeAsync(addr2)
    }).then(code => {
      c2 = code
      assert.equal(c1, c2, 'the deployed contract has incorrect code')
      resolve()
    })
  })
}

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

  before((done) => {
    // Truffle deploys contracts with accounts[0]
    user1 = accounts[0]
    nobody = accounts[1] // has no authority
    recoveryKey = accounts[4]

    IdentityFactoryWithRecoveryKey.deployed().then((instance) => {
      identityFactoryWithRecoveryKey = instance
      return Proxy.new({from: accounts[0]})
    }).then((instance) => {
      deployedProxy = instance
      return RecoverableController.new({from: accounts[0]})
    }).then((instance) => {
      deployedRecoverableController = instance
      done()
    })
  })

  it('Correctly creates proxy and controller', (done) => {
    identityFactoryWithRecoveryKey.CreateProxyWithControllerAndRecoveryKey(user1, recoveryKey, longTimeLock, shortTimeLock, {from: nobody})
    .then( (tx) => {
      let log=tx.logs[0];
      assert.equal(log.event,"IdentityCreated","wrong event");
      proxyAddress = log.args.proxy
      recoverableControllerAddress = log.args.controller
      recoveryQuorumAddress = log.args.recoveryQuorum

      proxy = Proxy.at(proxyAddress)
      recoverableController = RecoverableController.at(recoverableControllerAddress)
      return compareCode(proxyAddress, deployedProxy.address)
    }).then(() => {
      return compareCode(recoverableControllerAddress, deployedRecoverableController.address)
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
    }).then((rk) => {
      assert.equal(rk, recoveryKey)
      done()
    }).catch(done)
  })
})
