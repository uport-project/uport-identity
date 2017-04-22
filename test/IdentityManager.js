const lightwallet = require('eth-signer')
const evm_increaseTime = require('./evmIncreaseTime.js')
const IdentityManager = artifacts.require('IdentityManager')
const Proxy = artifacts.require('Proxy')
const TestRegistry = artifacts.require('TestRegistry')
const Promise = require('bluebird')
const compareCode = require('./compareCode')
web3.eth = Promise.promisifyAll(web3.eth)

const LOG_NUMBER_1 = 1234
const LOG_NUMBER_2 = 2345

contract('IdentityManager', (accounts) => {
  let proxy
  let deployedProxy
  let testReg
  let identityManager
  let user1
  let user2
  let user3
  let user4
  let nobody

  let recoveryKey
  let recoveryKey2

  before((done) => {
    // Truffle deploys contracts with accounts[0]
    user1 = accounts[0]
    nobody = accounts[1] // has no authority
    user2 = accounts[2]
    user3 = accounts[3]
    user4 = accounts[4]
    recoveryKey = accounts[8]
    recoveryKey2 = accounts[9]

    IdentityManager.deployed().then((instance) => {
      identityManager = instance
      return Proxy.new({from: accounts[0]})
    }).then((instance) => {
      deployedProxy = instance
      return TestRegistry.deployed()
    }).then((instance) => {
      testReg = instance
      return identityManager.CreateIdentity(user1, recoveryKey, {from: nobody})
    }).then(tx => {
      const log = tx.logs[0]
      assert.equal(log.event, 'IdentityCreated', 'wrong event')
      proxy = Proxy.at(log.args.identity)
      done()
    })
  })

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
      // Check that the mapping has correct proxy address

      return compareCode(log.args.identity, deployedProxy.address)
    }).then(() => {
      Proxy.at(log.args.identity).owner.call().then((proxyOwner) => {
        assert.equal(proxyOwner, identityManager.address, 'Proxy owner should be the identity manager')
        done()
      }).catch(done)
    })
  })

  it('Only sends transactions initiated by owner', (done) => {
    // Encode the transaction to send to the Owner contract
    let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
    identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user1}).then(() => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_1, 'User1 should be able to send transaction')

      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
      return identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user2})
    }).then(() => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.notEqual(regData.toNumber(), LOG_NUMBER_2, 'User2 should not be able to send transaction')
      done()
    }).catch(done)
  })

  it('Allows multiple owners', (done) => {
    const event = identityManager.OwnerAdded({identity: proxy.address})
    event.watch((error, result) => {
      if (error) throw Error(error)
      event.stopWatching()
      assert.equal(result.args.owner,
                   user2,
                   'Owner key is set in event')
      assert.equal(result.args.instigator,
                   user1,
                   'Instigator key is set in event')
    })
    identityManager.addOwner(proxy.address, user2, {from: user1}).then(() => {
      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
      return identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user1})
     }).then((tx) => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_1, 'User1 should be able to send transaction')

      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
      return identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user2})
    }).then((tx) => {
      return evm_increaseTime(1)
    }).then(() => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_2, 'User2 can now send transaction')
      done()
    }).catch(done)
  })

  it('Allows recoveryKey to add owner', (done) => {
    const event = identityManager.OwnerAdded({identity: proxy.address})
    event.watch((error, result) => {
      if (error) throw Error(error)
      event.stopWatching()
      assert.equal(result.args.owner,
                   user3,
                   'Owner key is set in event')
      assert.equal(result.args.instigator,
                   recoveryKey,
                   'Instigator key is set in event')
    })
    identityManager.addOwnerForRecovery(proxy.address, user3, {from: recoveryKey}).then(() => {
      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
      return identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user1})
    }).then(() => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_1, 'User1 should be able to send transaction')

      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
      return identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user3})
    }).then((tx) => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.notEqual(regData.toNumber(), LOG_NUMBER_2, 'User3 should not yet be able to send transaction')

      return evm_increaseTime(86400)
    }).then(() => {
      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
      return identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user3})
    }).then((tx) => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_2, 'User3 can now send transaction')
      done()
    }).catch(done)
  })

  it('Allows removing of owners', (done) => {
    identityManager.addOwner(proxy.address, user2, {from: user1}).then(() => {
      return evm_increaseTime(1)
    }).then(() => {
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
      return identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user2})
    }).then(() => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_1, 'User2 should be able to send transaction')
    }).then(() => {
      const event = identityManager.OwnerRemoved({identity: proxy.address})
      event.watch((error, result) => {
        if (error) throw Error(error)
        event.stopWatching()
        assert.equal(result.args.owner,
                    user2,
                   'Owner key is set in event')
        assert.equal(result.args.instigator,
                    user1,
                   'Instigator key is set in event')
      })
      return identityManager.removeOwner(proxy.address, user2, {from: user1})
     }).then((tx) => {
      return evm_increaseTime(1)
    }).then(() => {
      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
      return identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user2})
    }).then((tx) => {
      return evm_increaseTime(1)
    }).then(() => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.notEqual(regData.toNumber(), LOG_NUMBER_2, 'User2 can not send transaction now')
      done()
    }).catch(done)
  })

  it('Allows changing of recoveryKey', (done) => {
    const event = identityManager.RecoveryChanged({identity: proxy.address})
    event.watch((error, result) => {
      if (error) throw Error(error)
      event.stopWatching()
      assert.equal(result.args.recoveryKey,
                   recoveryKey2,
                   'New recovery key is set in event')
      assert.equal(result.args.instigator,
                   user1,
                   'Instigator key is set in event')
    })
    identityManager.changeRecovery(proxy.address, recoveryKey2, {from: user1}).then(() => {
      return evm_increaseTime(1)
    }).then(() => {
      identityManager.OwnerAdded({identity: proxy.address}).watch((error, result) => {
        if (error) throw Error(error)
        event.stopWatching()
        assert.equal(result.args.owner,
                    user4,
                    'New owner is set in event')
        assert.equal(result.args.instigator,
                    recoveryKey2,
                    'Instigator key is set in event')
      })
      return identityManager.addOwnerForRecovery(proxy.address, user4, {from: recoveryKey2})
    }).then(() => {      
      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
      return identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user1})
    }).then(() => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_1, 'User1 should be able to send transaction')

      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
      return identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user4})
    }).then((tx) => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.notEqual(regData.toNumber(), LOG_NUMBER_2, 'user4 should not yet be able to send transaction')

      return evm_increaseTime(86401)
    }).then(() => {
      // Encode the transaction to send to the Owner contract
      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
      return identityManager.forwardTo(proxy.address, testReg.address, 0, data, {from: user4})
    }).then((tx) => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_2, 'User4 can now send transaction')
      done()
    }).catch(done)
  })
})
