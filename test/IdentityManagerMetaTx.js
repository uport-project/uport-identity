const lightwallet = require('eth-lightwallet')
const evm_increaseTime = require('./evmIncreaseTime.js')
const IdentityManager = artifacts.require('IdentityManager')
const Proxy = artifacts.require('Proxy')
const TestRegistry = artifacts.require('TestRegistry')
const Promise = require('bluebird')
const compareCode = require('./compareCode')
const solsha3 = require('solidity-sha3').default

web3.eth = Promise.promisifyAll(web3.eth)

var signPayload = function(functionName, proxyAddress, keystore, pwKey, signingAddr, inputs) {

  var zero = "0000000000000000000000000000000000000000000000000000000000000000"
  var one = "0000000000000000000000000000000000000000000000000000000000000001"

  // Need to pack the inputs in this exact way
  hashinput = identityManager.address + web3.toHex('forwardTo').slice(2) + zero + proxyAddress.slice(2) + testReg.address.slice(2) + zero + data.slice(2)
  let hash = solsha3(hashinput)

  let sig = lightwallet.signing.signMsgHash(lw, keyFromPw, hash, user1)
  let r = '0x'+sig.r.toString('hex')
  let s = '0x'+sig.s.toString('hex')
  let v = sig.v

  retVal = {}
  retVal.r = r
  retVal.s = s
  retVal.v = v

  
}

const LOG_NUMBER_1 = 1234
const LOG_NUMBER_2 = 2345

contract('IdentityManagerMetaTx', (accounts) => {
  let proxy
  let deployedProxy
  let testReg
  let identityManager
  let user1
  let user2
  let user3
  let user4
  let sender

  let recoveryKey
  let recoveryKey2

  let lw
  let keyFromPw

  before((done) => {
    // Truffle deploys contracts with accounts[0]

    let seed = "pull rent tower word science patrol economy legal yellow kit frequent fat"

    lightwallet.keystore.createVault(
      {hdPathString: "m/44'/60'/0'/0",
       seedPhrase: seed,
       password: "test",
       salt: "testsalt"
      }, 
      function (err, keystore) {

        lw = keystore
        lw.keyFromPassword("test", function(e,k) {
          keyFromPw = k

          lw.generateNewAddress(keyFromPw, 10)
          let acct = lw.getAddresses()

          user1 = '0x'+acct[0]
          nobody = '0x'+acct[1] // has no authority
          user2 = '0x'+acct[2]
          user3 = '0x'+acct[3]
          user4 = '0x'+acct[4]
          recoveryKey = '0x'+acct[8]
          recoveryKey2 = '0x'+acct[9]

          sender = accounts[0]

          IdentityManager.deployed().then((instance) => {
            identityManager = instance
            return Proxy.new({from: sender})
          }).then((instance) => {
            deployedProxy = instance
            return TestRegistry.deployed()
          }).then((instance) => {
            testReg = instance
            return identityManager.CreateIdentity(user1, recoveryKey, {from: sender})
          }).then(tx => {
            const log = tx.logs[0]
            assert.equal(log.event, 'IdentityCreated', 'wrong event')
            proxy = Proxy.at(log.args.identity)
            done()
          })
        })
      })
  })

  it('Correctly creates Identity', (done) => {
    let log
    identityManager.CreateIdentity(user1, recoveryKey, {from: sender}).then(tx => {
      log = tx.logs[0]
      assert.equal(log.event, 'IdentityCreated', 'wrong event')

      assert.equal(log.args.owner,
                   user1,
                   'Owner key is set in event')
      assert.equal(log.args.recoveryKey,
                   recoveryKey,
                   'Recovery key is set in event')
      assert.equal(log.args.creator,
                   sender,
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

    var zero = "0000000000000000000000000000000000000000000000000000000000000000"
    var one = "0000000000000000000000000000000000000000000000000000000000000001"

    // Need to pack the inputs in this exact way
    hashinput = identityManager.address + web3.toHex('forwardTo').slice(2) + zero + proxy.address.slice(2) + testReg.address.slice(2) + zero + data.slice(2)

    let hash = solsha3(hashinput)

    let sig = lightwallet.signing.signMsgHash(lw, keyFromPw, hash, user1)
    let r = '0x'+sig.r.toString('hex')
    let s = '0x'+sig.s.toString('hex')
    let v = sig.v

    identityManager.metaTxForwardTo(v, r, s, proxy.address, testReg.address, 0, data, {from: sender}).then(() => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {

      assert.equal(regData.toNumber(), LOG_NUMBER_1, 'User1 should be able to send transaction')

      let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])

      var zero = "0000000000000000000000000000000000000000000000000000000000000000"
      var one = "0000000000000000000000000000000000000000000000000000000000000001"

      // Need to pack the inputs in this exact way
      hashinput = identityManager.address + web3.toHex('forwardTo').slice(2) + one + proxy.address.slice(2) + testReg.address.slice(2) + zero + data.slice(2)

      let hash = solsha3(hashinput)

      let sig = lightwallet.signing.signMsgHash(lw, keyFromPw, hash, user1)
      let r = '0x'+sig.r.toString('hex')
      let s = '0x'+sig.s.toString('hex')
      let v = sig.v

      return identityManager.metaTxForwardTo(v, r, s, proxy.address, testReg.address, 0, data, {from: sender})
    }).then(() => {
      // Verify that the proxy address is logged as the sender
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_2, 'User1 should be able to send a transaction with nonce = 1')
      done()
    }).catch(done)
  })

})
