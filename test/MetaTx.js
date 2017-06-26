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



const LOG_NUMBER_1 = 1234
const LOG_NUMBER_2 = 2345

const userTimeLock = 100;
const adminTimeLock = 1000;
const adminRate = 200;

const zero = "0000000000000000000000000000000000000000000000000000000000000000"

function enc(funName, types, params) {
  return '0x' + lightwallet.txutils._encodeFunctionTxData(funName, types, params)
}

//Returns random number in [1, 99]
function getRandomNumber() { //Thanks Oed :~)
  return Math.floor(Math.random() * (100 - 1)) + 1;
}

//Returns a random hex string
function getRandomHexString(length) {
  var randStr = "";
  var hexChar = "0123456789abcdef"
  for (var i = 0; i < length; i++) {
    randStr += hexChar.charAt(Math.floor(Math.random() * hexChar.length))
  }
  return randStr
}

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

function signPayload(relayContract, signingAddr, sendingAddress, destination,
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

              //Tight packing, as Solidity sha3 does
              hashInput = relayContract.address + pad(nonce.toString('16')).slice(2)
                          + destination.slice(2) + data.slice(2) + sendingAddress.slice(2)
              hash = solsha3(hashInput)
              sig = lightwallet.signing.signMsgHash(lw, keyFromPw, hash, signingAddr)
              retVal.r = '0x'+sig.r.toString('hex')
              retVal.s = '0x'+sig.s.toString('hex')
              retVal.v = sig.v //Q: Why is this not converted to hex?
              retVal.data = data
              retVal.hash = hash
              retVal.nonce = nonce
              resolve(retVal)
            })
    })
}

contract('TxRelay', (accounts) => {
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

  let data
  let types
  let params
  let newData
  let res
  let regData
  let p
  let errorThrown = false;

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
          regularUser = accounts[2]

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

  describe("Regular transactions", () => {
    //Deploy a new Proxy controlled by regular user who does not use meta tx
    beforeEach(async function() {
      errorThrown = false
      metaIdentityManager = await MetaIdentityManager.new(userTimeLock, adminTimeLock, adminRate, txRelay.address)
      let tx = await metaIdentityManager.CreateIdentity(regularUser, recoveryKey, {from: sender})
      assert.equal(tx.logs[0].event, 'IdentityCreated', 'Wrong event')
      proxy = Proxy.at(tx.logs[0].args.identity)
    })

    it('Should forward properly formatted tx', async function() {
      data = enc('register', ['uint256'], [LOG_NUMBER_1])
      types = ['address', 'address', 'address', 'uint256', 'bytes']
      params = [regularUser, proxy.address, testReg.address, 0, data]
      newData = enc('forwardTo', types, params)

      res = await txRelay.checkAddress(newData, regularUser)
      assert.isTrue(res, "Address is not first parameter")

      await txRelay.relayTx(metaIdentityManager.address, newData, {from: regularUser})
      regData = await testReg.registry.call(proxy.address)
      assert.equal(regData.toNumber(), LOG_NUMBER_1, 'Registry did not update properly')
    })

    it('Should not forward tx from someone lying about address', async function() {
      data = enc('register', ['uint256'], [LOG_NUMBER_1])
      types = ['address', 'address', 'address', 'uint256', 'bytes']
      params = [user1, proxy.address, testReg.address, 0, data] //lies about who they are
      newData = enc('forwardTo', types, params)

      res = await txRelay.checkAddress(newData, regularUser)
      assert.isFalse(res, "Address is first parameter, should be someone else")

      try {
        await txRelay.relayTx( metaIdentityManager.address, newData, {from: regularUser})
      } catch(e) {
        assert.isFalse(errorThrown, "Sanity check")
        assert.match(e.message, /invalid JUMP/, "Should have thrown, user lied about address")
        errorThrown = true
      }

      assert.isTrue(errorThrown, "Should have thrown, user lied about address")
      regData = await testReg.registry.call(proxy.address)
      assert.equal(regData.toNumber(), 0, 'Registry updated, should not have')
    })

    it('Should not forward properly formatted tx with Ether', async function() {
      data = enc('register', ['uint256'], [LOG_NUMBER_1])
      types = ['address', 'address', 'address', 'uint256', 'bytes']
      params = [regularUser, proxy.address, testReg.address, 0, data]
      newData = enc('forwardTo', types, params)

      res = await txRelay.checkAddress(newData, regularUser)
      assert.isTrue(res, "Address is not first parameter")

      try {
        await txRelay.relayTx(metaIdentityManager.address, newData, {from: regularUser, value: 100})
      } catch (e) {
        assert.isFalse(errorThrown, "Sanity check")
        assert.match(e.message, /invalid JUMP/, "Should have thrown, cannot forward Ether")
        errorThrown = true;
      }

      assert.isTrue(errorThrown, "Should have thrown, cannot forward Ether")
      regData = await testReg.registry.call(proxy.address)
      assert.equal(regData.toNumber(), 0, 'Registry updated, should not have')
    })

    it('Should forward tx multiple times', async function() {
      for (let i = 0; i < 100; i++) {
        let randNum = getRandomNumber()
        data = enc('register', ['uint256'], [randNum])
        types = ['address', 'address', 'address', 'uint256', 'bytes']
        params = [regularUser, proxy.address, testReg.address, 0, data]
        newData = enc('forwardTo', types, params)

        await txRelay.relayTx(metaIdentityManager.address, newData, {from: regularUser})
        regData = await testReg.registry.call(proxy.address)
        assert.equal(regData.toNumber(), randNum, 'Registry did not update properly')
      }
    })
  })

  describe("Meta transactions", () => {
    beforeEach(async function() {
      errorThrown = false
    })

    it('Should forward properly formatted meta tx', async function() {
      //Setup data and sign
      data = enc('register', ['uint256'], [LOG_NUMBER_1])
      types = ['address', 'address', 'address', 'uint256', 'bytes']
      params = [user1, proxy.address, testReg.address, 0, data]
      p = await signPayload(txRelay, user1, sender, metaIdentityManager.address,
                                          'forwardTo', types, params, lw, keyFromPw)

      res = await txRelay.checkAddress.call(p.data, user1)
      assert.isTrue(res, "Address is not first parameter")

      await txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user1, {from: sender})
      regData = await testReg.registry.call(proxy.address)
      assert.equal(regData.toNumber(), LOG_NUMBER_1, 'Registry did not update properly')

      //Setup another transaction
      data = enc('register', ['uint256'], [LOG_NUMBER_2])
      types = ['address', 'address', 'address', 'uint256', 'bytes']
      params = [user1, proxy.address, testReg.address, 0, data]
      p = await signPayload(txRelay, user1, sender, metaIdentityManager.address, 'forwardTo', types, params, lw, keyFromPw)
      assert.equal(p.nonce.toString(), "1", "Nonce did not increment")

      await txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user1, {from: sender})
      regData = await  testReg.registry.call(proxy.address)
      assert.equal(regData.toNumber(), LOG_NUMBER_2, 'Registry did not update properly')
    })


    it('Should forward properly formatted meta tx, though future calls may fail', async function() {
      data = enc('register', ['uint256'], [LOG_NUMBER_1])
      types = ['address', 'address', 'address', 'uint256', 'bytes']
      params = [user2, proxy.address, testReg.address, 0, data]
      p = await signPayload(txRelay, user2, sender, metaIdentityManager.address, 'forwardTo', types, params, lw, keyFromPw)

      res = await txRelay.checkAddress.call(p.data, user2)
      assert.isTrue(res, "Address is not first parameter")

      //Does not throw as the nonce needs to be updated
      await txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user2,  {from: sender})
      regData = await testReg.registry.call(proxy.address)
      assert.equal(regData.toNumber(), 0, 'Registry updated, should not have')

      //Try another transaction, where nonce should have updated.
      data = enc('register', ['uint256'], [LOG_NUMBER_2])
      types = ['address', 'address', 'address', 'uint256', 'bytes']
      params = [user2, proxy.address, testReg.address, 0, data]
      p = await signPayload(txRelay, user2, sender, metaIdentityManager.address, 'forwardTo', types, params, lw, keyFromPw)
      assert.equal(p.nonce.toString(), '1', 'Nonce should have updated, even though sub-call failed')

      await txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user2, {from: sender})
      regData = await testReg.registry.call(proxy.address)
      assert.equal(regData.toNumber(), 0, 'Registry updated, should not have')
    })

    it('Should not forward meta tx from someone lying about address', async function() {
      data = enc('register', ['uint256'], [LOG_NUMBER_1])
      types = ['address', 'address', 'address', 'uint256', 'bytes']
      params = [user1, proxy.address, testReg.address, 0, data]
      //Claim to be user1 by encoding their address, but can only sign w/ user2 key, as they don't have user1's key
      p = await signPayload(txRelay, user2, sender, metaIdentityManager.address, 'forwardTo', types, params, lw, keyFromPw)
      res = await txRelay.checkAddress.call(p.data, user1)
      //This will still pass. User should be able to encode anything they want in data.
      assert.isTrue(res, "Address is not first parameter")

      try {
        await txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user2, {from: sender})
      } catch (e) {
        assert.match(e.message, /invalid JUMP/, "Should have thrown, user lied about address")
        errorThrown = true
      }

      assert.isTrue(errorThrown, "Should have thrown, user lied about address")
      regData = await testReg.registry.call(proxy.address)
      assert.equal(regData.toNumber(), 0, 'Registry updated, should not have')
    })

    it('Should not forward meta tx from a dishonest relayer', async function() {
      // Encode the transaction to send to the Owner contract
      data = enc('register', ['uint256'], [LOG_NUMBER_1])
      types = ['address', 'address', 'address', 'uint256', 'bytes']
      params = [user1, proxy.address, testReg.address, 0, data]
      //Claim to be user1 by encoding their address, but can only sign w/ their key, as they don't have user1's key
      p = await signPayload(txRelay, user1, sender, metaIdentityManager.address, 'forwardTo', types, params, lw, keyFromPw)
      res = await txRelay.checkAddress.call(p.data, user1)
      assert.isTrue(res, "Address is not first parameter")

      try {
        await  txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user2, {from: notSender})
      } catch (e) {
        assert.isFalse(errorThrown, "Sanity check")
        assert.match(e.message, /invalid JUMP/, "Should have thrown, wrong relayer forwarded")
        errorThrown = true
      }
      assert.isTrue(errorThrown, "Should have thrown, wrong relayer forwarded")

      regData = await testReg.registry.call(proxy.address)
      assert.equal(regData.toNumber(), 0, 'Registry updated, should not have')
    })

    it('Should not forward meta tx with Ether', async function () {
      //Setup data and sign
      data = enc('register', ['uint256'], [LOG_NUMBER_1])
      types = ['address', 'address', 'address', 'uint256', 'bytes']
      params = [user1, proxy.address, testReg.address, 0, data]
      p = await signPayload(txRelay, user1, sender, metaIdentityManager.address,
                                          'forwardTo', types, params, lw, keyFromPw)

      res = await txRelay.checkAddress.call(p.data, user1)
      assert.isTrue(res, "Address is not first parameter")

      try {
        await txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user1, {from: sender, value: 10000})
      } catch(e) {
        assert.isFalse(errorThrown, "Sanity check")
        assert.match(e.message, /invalid JUMP/, "Should have thrown an error, included Ether")
        errorThrown = true;
      }
      assert.isTrue(errorThrown, "Should have thrown an error, included Ether")
      regData = await testReg.registry.call(proxy.address)
      assert.equal(regData.toNumber(), 0, 'Registry updated, should not have')
    })

    it('Should forward meta tx multiple times', async function() {
      for (let i = 0; i < 100; i++) {
        let randNum = getRandomNumber()
        data = enc('register', ['uint256'], [randNum])
        types = ['address', 'address', 'address', 'uint256', 'bytes']
        params = [user1, proxy.address, testReg.address, 0, data]
        p = await signPayload(txRelay, user1, sender, metaIdentityManager.address,
                                    'forwardTo', types, params, lw, keyFromPw)
        assert.equal(p.nonce, i.toString(), "Nonce should have updated")
        await txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user1, {from: sender})
        regData = await testReg.registry.call(proxy.address)
        assert.equal(regData.toNumber(), randNum, 'Registry did not update properly')
      }
    })
  })

  //Not working properly
  it('Should not have massive overhead :~)', async function() {
    //Setup data and sign
    data = enc('register', ['uint256'], [LOG_NUMBER_1])
    types = ['address', 'address', 'address', 'uint256', 'bytes']
    params = [user1, proxy.address, testReg.address, 0, data]

    //FIRST: Test throw, to increment the nonce for better reporting
    throwData = enc('doThrow', [], [])
    throwParams = [user1, proxy.address, testReg.address, 0, throwData]
    pThrow = await signPayload(txRelay, user1, sender, metaIdentityManager.address,
                                        'forwardTo', types, params, lw, keyFromPw)

    await txRelay.relayMetaTx(pThrow.v, pThrow.r, pThrow.s, metaIdentityManager.address,
                              pThrow.data, user1, {from: sender})

    p = await signPayload(txRelay, user1, sender, metaIdentityManager.address,
                                        'forwardTo', types, params, lw, keyFromPw)

    assert.equal(p.nonce.toString(), "1", "Nonce should have been incremented")

    res = await txRelay.checkAddress.call(p.data, user1)
    assert.isTrue(res, "Address is not first parameter")

    let tx = await txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user1, {from: sender})
    //console.log("Meta-tx, set from zeros: ", tx.receipt.gasUsed)
    regData = await testReg.registry.call(proxy.address)
    assert.equal(regData.toNumber(), LOG_NUMBER_1, 'Registry did not update properly')

    //Try with a non-meta tx
    tx = await metaIdentityManager.CreateIdentity(regularUser, recoveryKey, {from: sender})
    const log = tx.logs[0]
    assert.equal(log.event, 'IdentityCreated', 'wrong event')
    let newProxy = Proxy.at(log.args.identity)

    tx = await metaIdentityManager.forwardTo(regularUser, newProxy.address, testReg.address, 0, data, {from: regularUser})
    //console.log("IdenManager (no meta) tx, set from zeros: ", tx.receipt.gasUsed)

    tx = await testReg.register(LOG_NUMBER_1)
    //console.log("regular transaction, set from zeros: ", tx.receipt.gasUsed)

    //Try again.
    data = enc('register', ['uint256'], [LOG_NUMBER_2])
    types = ['address', 'address', 'address', 'uint256', 'bytes']
    params = [user1, proxy.address, testReg.address, 0, data]
    p = await signPayload(txRelay, user1, sender, metaIdentityManager.address,
                                        'forwardTo', types, params, lw, keyFromPw)

    assert.equal(p.nonce.toString(), "2", "Nonce should have been incremented twice")

    tx = await txRelay.relayMetaTx(p.v, p.r, p.s, metaIdentityManager.address, p.data, user1, {from: sender})
    //console.log("Meta-tx, set from non-zeros: ", tx.receipt.gasUsed)
    regData = await testReg.registry.call(proxy.address)
    assert.equal(regData.toNumber(), LOG_NUMBER_2, 'Registry did not update properly')

    tx = await metaIdentityManager.forwardTo(regularUser, newProxy.address, testReg.address, 0, data, {from: regularUser})
    //console.log("IdenManager (no meta) tx, set from non-zeros: ", tx.receipt.gasUsed)

    tx = await testReg.register(LOG_NUMBER_1)
    //console.log("regular transaction, set from non-zeros: ", tx.receipt.gasUsed)
  })

  it('Should not approve bad data', async function () {
    //This function needs some serious thought + testing
    let t = ['address', 'address', 'address', 'uint256', 'bytes'] //types
    let p = [user1, proxy.address, testReg.address, 0, []] //params
    let n = "forwardTo" //name of function

    //encoded correctly
    data = enc(n, t, p)
    res = await txRelay.checkAddress.call(data, user1)
    assert.isTrue(res, "Address is not first parameter")
    //off by a nibble
    data = enc(n, t, p).slice(1)
    res = await txRelay.checkAddress.call(data, user1)
    assert.isFalse(res, "Address is first parameter, should be shifted off")
    //short
    data = enc(n, t, p).substring(0, 16)
    res = await txRelay.checkAddress.call(data, user1)
    assert.isFalse(res, "Address is first parameter, should be too short")
    //wrong address
    let badParam = [user2, proxy.address, testReg.address, 0, []]
    data = enc(n, t, badParam)
    res = await txRelay.checkAddress.call(data, user1)
    assert.isFalse(res, "Address is first parameter, should be someone else")
    //first half of address
    data = enc(n, t, p).substring(0, 26) + zero
    res = await txRelay.checkAddress.call(data, user1)
    assert.isFalse(res, "Address is first parameter, should be too short")

    //Test with a bunch of randomly generated data
    for (let i = 0; i < 10; i++) {
      data = getRandomHexString(36); //minimal length to possibly pass
      res = await txRelay.checkAddress(data, user1) //probabilistically, should never be true.
      assert.isFalse(res, "Address is first parameter, probabilistically should not be")
    }
    })
})
