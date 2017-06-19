const lightwallet = require('eth-lightwallet')
const evm_increaseTime = require('./evmIncreaseTime.js')
const MetaTxRelay = artifacts.require('TxRelay')
const MetaIdentityManager = artifacts.require('MetaIdentityManager')
const Proxy = artifacts.require('Proxy')
const TestRegistry = artifacts.require('TestRegistry')
const Promise = require('bluebird')
const compareCode = require('./compareCode')
const solsha3 = require('solidity-sha3').default
web3.eth = Promise.promisifyAll(web3.eth)

let zero = "0000000000000000000000000000000000000000000000000000000000000000"

//Left packs a (hex) string
function pad(n) {
  assert.equal(typeof(n), 'string', "Passed in a non string")
  let data
  if (n.startsWith("0x")) {
    data = '0x' + new Array(64 - n.length + 3).join('0') + n.slice(2);
    assert.equal(data.length, 66, "packed incorrectly")
    return data;
  } else {
    data = '0x' + new Array(64 - n.length + 1).join('0') + n
    assert.equal(data.length, 66, "packed incorrectly")
    return data;
  }
}

function signPayload(relayContract, signingAddr, sendingAddress, destination, numBlocks,
                    functionName, functionTypes, functionParams, lw, keyFromPw) {
    return new Promise(
        function (resolve, reject) {
            if (functionTypes.length !== functionParams.length || typeof(functionName) !== 'string') {
              reject(error)
            }
            //Prolly should check inputs more thoroughly :@
            let nonce
            let blockTimeout
            let data
            let hashInput
            let hash
            let sig
            let retVal = {}
            data = '0x' + lightwallet.txutils._encodeFunctionTxData(functionName, functionTypes, functionParams)

            relayContract.getNonce.call(signingAddr).then(currNonce => {
              nonce = currNonce
              return relayContract.getBlock.call()
            }).then(currBlock => {
              //console.log("Current Block:", currBlock)
              blockTimeout = currBlock.plus(numBlocks)
              //console.log("Block Timeout:", blockTimeout)
              //Tight packing, as Solidity sha3 does
              hashInput = relayContract.address + pad(nonce.toString('16')).slice(2)
                          + destination.slice(2) + data.slice(2) + sendingAddress.slice(2)
                          + pad(blockTimeout.toString('16')).slice(2)
              hash = solsha3(hashInput)
              sig = lightwallet.signing.signMsgHash(lw, keyFromPw, hash, signingAddr)
              retVal.r = '0x'+sig.r.toString('hex')
              retVal.s = '0x'+sig.s.toString('hex')
              retVal.v = sig.v //Q: Why is this not converted to hex?
              retVal.data = data
              retVal.blockTimeout = blockTimeout.toString()
              retVal.hash = hash
              retVal.nonce = nonce
              resolve(retVal)
            })
    })
}


const LOG_NUMBER_1 = 1234
const LOG_NUMBER_2 = 2345

const userTimeLock = 100;
const adminTimeLock = 1000;
const adminRate = 200;

contract('IdentityManagerMetaTx', (accounts) => {
  let proxy
  let deployedProxy
  let testReg
  let metaIdentityManager
  let txRelay
  let user1
  let user2
  let user3
  let user4
  let sender

  let recoveryKey
  let recoveryKey2

  let lw
  let keyFromPw

  beforeEach((done) => {
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
          notSender = accounts[1]

          MetaTxRelay.new().then(instance => {
            txRelay = instance
            return MetaIdentityManager.new(userTimeLock, adminTimeLock, adminRate, txRelay.address)
          }).then(instance => {
            metaIdentityManager = instance
            return Proxy.new({from: sender})
          }).then(instance => {
            deployedProxy = instance
            return TestRegistry.new()
          }).then((instance) => {
            testReg = instance
            return metaIdentityManager.CreateIdentity(user1, recoveryKey, {from: sender})
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
    metaIdentityManager.CreateIdentity(user1, recoveryKey, {from: sender}).then(tx => {
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
        assert.equal(proxyOwner, metaIdentityManager.address, 'Proxy owner should be the identity manager')
        done()
      }).catch(done)
    })
  })


  it('Sends transactions initiated by owner', (done) => {
    // Encode the transaction to send to the Owner contract
    let p
    let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
    let types = ['address', 'address', 'address', 'uint256', 'bytes']
    let params = [user1, proxy.address, testReg.address, 0, data]
    signPayload(txRelay, user1, sender, metaIdentityManager.address, 100, 'forwardTo', types, params, lw, keyFromPw).then(retVal => {
      p = retVal
      return txRelay.checkAddress.call(p.data, user1)
    }).then(res => {
      assert.isTrue(res, "Address should be included as first input in data")
      return txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user1, p.blockTimeout, {from: sender})
    }).then(tx => {
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_1, 'User1 should be able to send transaction')
      //Send another transaction, as well as check that nonce is updated.
      data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
      types = ['address', 'address', 'address', 'uint256', 'bytes']
      params = [user1, proxy.address, testReg.address, 0, data]
      return signPayload(txRelay, user1, sender, metaIdentityManager.address, 100, 'forwardTo', types, params, lw, keyFromPw)
    }).then(retVal => {
      p = retVal
      assert.equal(p.nonce.toString(), "1", "Nonce did not increment")
      return txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user1, p.blockTimeout, {from: sender})
    }).then(tx => {
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_2, 'User1 should be able to send another transaction')
      done()
    }).catch(done)
  })

  it('Sends properly formatted transactions initiated by non-owner, but MetaIdentityManager stops them', (done) => {
    let p
    let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
    let types = ['address', 'address', 'address', 'uint256', 'bytes']
    let params = [user2, proxy.address, testReg.address, 0, data]
    signPayload(txRelay, user2, sender, metaIdentityManager.address, 100, 'forwardTo', types, params, lw, keyFromPw).then(retVal => {
      p = retVal
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), 0, 'Should have reset the test registry')
      return txRelay.checkAddress.call(p.data, user2)
    }).then(res => {
      assert.isTrue(res, "Address should be included as first input in data")
      return txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user2, p.blockTimeout,  {from: sender})
    }).then(tx => {
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), 0, 'User2 should not be able to send transaction')
      // note: the reason this does not throw an error is that the nonce should be updated.
      // thus, while the sub call throws, the relay call itself does not.
      // try again, this time should have a different nonce.
      data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
      types = ['address', 'address', 'address', 'uint256', 'bytes']
      params = [user2, proxy.address, testReg.address, 0, data]
      return signPayload(txRelay, user2, sender, metaIdentityManager.address, 100, 'forwardTo', types, params, lw, keyFromPw)
    }).then(retVal => {
      p = retVal
      assert.equal(p.nonce.toString(), '1', 'Nonce should have updated, even though sub-call failed')
      return txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user2, p.blockTimeout, {from: sender})
    }).then(tx => {
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), 0, 'User2 should still not be able to send a transaction')
      done()
    }).catch(done)
  })


  it('Doesn\'t send transactions initiated by someone claiming to be someone else', (done) => {
    let p
    let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
    let types = ['address', 'address', 'address', 'uint256', 'bytes']
    let params = [user1, proxy.address, testReg.address, 0, data]
    //Claim to be user1 by encoding their address, but can only sign w/ user2 key, as they don't have user1's key
    signPayload(txRelay, user2, sender, metaIdentityManager.address, 100, 'forwardTo', types, params, lw, keyFromPw).then(retVal => {
      p = retVal
      return txRelay.checkAddress.call(p.data, user1)
    }).then(res => {
      //This will still pass. User should be able to encode anything they want in data.
      assert.isTrue(res, "Address should be included as first input in data")
      return txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user2, p.blockTimeout, {from: sender})
    }).then(tx => {
      assert.isTrue(false, "Transaction above should have failed")
    }).catch(error => {
      assert.match(error.message, /invalid JUMP/, "should have thrown an error")
    }).then(() => {
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), 0, 'Transaction should not have been processed')
      done()
    }).catch(done)
  })

  it('Shouldn\'t allow a relayer other than the one allowed', (done) => {
    // Encode the transaction to send to the Owner contract
    let p
    let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
    let types = ['address', 'address', 'address', 'uint256', 'bytes']
    let params = [user1, proxy.address, testReg.address, 0, data]
    //Claim to be user1 by encoding their address, but can only sign w/ their key, as they don't have user1's key
    signPayload(txRelay, user1, sender, metaIdentityManager.address, 100, 'forwardTo', types, params, lw, keyFromPw).then(retVal => {
      p = retVal
      return txRelay.checkAddress.call(p.data, user1)
    }).then(res => {
      assert.isTrue(res, "Address should be included as first input in data")
      return txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user2, p.blockTimeout, {from: notSender, gas: 3000000})
    }).then(tx => {
      assert.isTrue(false, "Transaction above should have failed")
    }).catch(error => {
      assert.match(error.message, /invalid JUMP/, "should have thrown an error")
    }).then(() => {
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), 0, 'Transaction should not have been processed')
      done()
    }).catch(done)
  })

  it('should not allow ether to be sent with a meta-tx ether', (done) => {
    // Encode the transaction to send to the Owner contract
    let p
    let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
    let types = ['address', 'address', 'address', 'uint256', 'bytes']
    let params = [user1, proxy.address, testReg.address, 0, data]
    signPayload(txRelay, user1, sender, metaIdentityManager.address, 100, 'forwardTo', types, params, lw, keyFromPw).then(retVal => {
      p = retVal
      return txRelay.checkAddress.call(p.data, user1)
    }).then(res => {
      assert.isTrue(res, "Address should be included as first input in data")
      //Same as first transaction, and sent with Wei
      return txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user1, p.blockTimeout, {from: sender, value: 100})
    }).catch(error => {
      assert.match(error, /invalid JUMP/, "should have thrown an error as ether was sent")
    }).then(tx => {
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), '0', 'User1 should be able to send transaction')

      //Sign again, this time should have a different nonce.
      data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_2])
      types = ['address', 'address', 'address', 'uint256', 'bytes']
      params = [user1, proxy.address, testReg.address, 0, data]
      return signPayload(txRelay, user1, sender, metaIdentityManager.address, 100, 'forwardTo', types, params, lw, keyFromPw)
    }).then(retVal => {
      p = retVal
      assert.equal(p.nonce.toString(), "0", "Nonce should not have incremented, as tx threw.")
      return txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user1, p.blockTimeout, {from: sender})
    }).then(tx => {
      return testReg.registry.call(proxy.address)
    }).then((regData) => {
      assert.equal(regData.toNumber(), LOG_NUMBER_2, 'User1 should be able to another transaction')
      done()
    }).catch(done)
  })

  it('should not send transaction that has timed out', (done) => {
    // Encode the transaction to send to the Owner contract
    let p
    let data = '0x' + lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1])
    let types = ['address', 'address', 'address', 'uint256', 'bytes']
    let params = [user1, proxy.address, testReg.address, 0, data]
    //Give it a 0 block leway, then call a function to advance block forward one
    signPayload(txRelay, user1, sender, metaIdentityManager.address, 0, 'forwardTo', types, params, lw, keyFromPw).then(retVal => {
      p = retVal
      //This will throw, but will advance blocks forward by one.
      return metaIdentityManager.forwardTo(sender, deployedProxy.address, testReg.address, 0, data)
    }).then(() => {
      assert.isTrue(false, "should have thrown an error")
    }).catch(e => {
      assert.match(e, /invalid JUMP/, 'should have thrown')
      return txRelay.checkAddress.call(p.data, user1)
    }).then(res => {
      assert.isTrue(res, "Address should be included as first input in data")
      return txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user1, p.blockTimeout, {from: sender})
    }).then(tx => {
      assert.isTrue(false, 'should have thrown an error')
    }).catch(e => {
      assert.match(e, /invalid JUMP/, 'should have thrown')
      done()
    }).catch(done)
  })


  //Issues w/ getting account to unlock as it is not a truffle account. will
  //fix this later.
  /*
  it('Should allow ether to be sent with a regular transaction?', (done) => {
    //Deposit money in the proxy contract
    //this will call the fallback as there is no function w/ this signature, but need to ecode address
    let data = '0x' + lightwallet.txutils._encodeFunctionTxData('randomName', ['address'], [user1])
    txRelay.checkAddress.call(data, user1).then(res => {
      assert.isTrue(res, "no data provided")
      return txRelay.checkAddress.call(data, user2)
    }).then(res => {
      assert.isFalse(res, "should not be valid address")
      return txRelay.relayTx(proxy.address, data, {from: user1, value: 100})
    }).then((tx) => {
      console.log(tx)
      // Verify that the proxy address is logged as the sender
      done()
    }).catch(done)
  }) */


  it('Should not approve bad data', (done) => {
    //This function needs some serious thought + testing
    let types = ['address', 'address', 'address', 'uint256', 'bytes']
    let params = [user1, proxy.address, testReg.address, 0, []]

    let emptyData = '0x' + lightwallet.txutils._encodeFunctionTxData('', [], [])
    //What happens with a send? Are the first 4 bytes empty? Yes, so this is a worry. Should assume they can't send eth through a meta-tx
    let shortData = '0x' + lightwallet.txutils._encodeFunctionTxData('forwardTo', types, params).substring(0, 16)
    let longData = '0x' + lightwallet.txutils._encodeFunctionTxData('forwardTo', types, params)
    let wrongAddressData =  '0x' + lightwallet.txutils._encodeFunctionTxData('forwardTo', types, [user2, proxy.address, testReg.address, 0, []]).substring(0, 16)
    let firstHalfAddressData = '0x' + lightwallet.txutils._encodeFunctionTxData('forwardTo', types, params).substring(0, 26) + zero


    txRelay.checkAddress.call(emptyData, user1).then(res => {
      assert.isFalse(res, "Empty data should not return true")
      return txRelay.checkAddress.call(shortData, user1)
    }).then(res => {
      assert.isFalse(res, "Data that is to short should return false")
      return txRelay.checkAddress.call(longData, user1)
    }).then(res => {
      assert.isTrue(res, 'Correctly encoded address should return true')
      return txRelay.checkAddress.call(wrongAddressData, user1)
    }).then(res => {
      assert.isFalse(res, "Other address should not be allowed")
      return txRelay.checkAddress.call(firstHalfAddressData, user1)
    }).then(res => {
      assert.isFalse(res, "Full address is not included")
      done()
    })
  })
})
