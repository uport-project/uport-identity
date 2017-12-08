const lightwallet = require('eth-lightwallet')
const evm_increaseTime = require('./utils/evmIncreaseTime.js')
const MetaTxRelay = artifacts.require('TxRelay')
const MetaIdentityManager = artifacts.require('MetaIdentityManager')
const Proxy = artifacts.require('Proxy')
const TestRegistry = artifacts.require('TestRegistry')
const MetaTestRegistry = artifacts.require('MetaTestRegistry')
const Promise = require('bluebird')
const compareCode = require('./utils/compareCode')
const assertThrown = require('./utils/assertThrown')
const solsha3 = require('solidity-sha3').default
const leftPad = require('left-pad')

const LOG_NUMBER_1 = 1234
const LOG_NUMBER_2 = 2345

const userTimeLock = 50;
const adminTimeLock = 200;
const adminRate = 50;

//NOTE: All references to identityManager in this contract are to a metaIdentityManager

const zero = "0000000000000000000000000000000000000000000000000000000000000000"
const zeroAddress = "0x0000000000000000000000000000000000000000"

function enc(funName, types, params) {
  return '0x' + lightwallet.txutils._encodeFunctionTxData(funName, types, params)
}

//Returns random number in [1, 99]
function getRandomNumber() { //Thanks Oed :~)
  return Math.floor(Math.random() * (100 - 1)) + 1;
}

//Left packs a (hex) string. Should probably use leftpad
function pad(n) {
  assert.equal(typeof(n), 'string', "Passed in a non string")
  let data
  if (n.startsWith("0x")) {
    data = '0x' + leftPad(n.slice(2), '64', '0')
    assert.equal(data.length, 66, "packed incorrectly")
    return data;
  } else {
    data = '0x' + leftPad(n, '64', '0')
    assert.equal(data.length, 66, "packed incorrectly")
    return data;
  }
}

async function signPayload(signingAddr, txRelay, whitelistOwner, destinationAddress, functionName,
                     functionTypes, functionParams, lw, keyFromPw)
{
   if (functionTypes.length !== functionParams.length) {
     return //should throw error
   }
   if (typeof(functionName) !== 'string') {
     return //should throw error
   }
   let nonce
   let blockTimeout
   let data
   let hashInput
   let hash
   let sig
   let retVal = {}
   data = enc(functionName, functionTypes, functionParams)

   nonce = await txRelay.getNonce.call(signingAddr)
   //Tight packing, as Solidity sha3 does
   hashInput = '0x1900' + txRelay.address.slice(2) + whitelistOwner.slice(2) + pad(nonce.toString('16')).slice(2)
               + destinationAddress.slice(2) + data.slice(2)
   hash = solsha3(hashInput)
   sig = lightwallet.signing.signMsgHash(lw, keyFromPw, hash, signingAddr)
   retVal.r = '0x'+sig.r.toString('hex')
   retVal.s = '0x'+sig.s.toString('hex')
   retVal.v = sig.v //Q: Why is this not converted to hex?
   retVal.data = data
   retVal.hash = hash
   retVal.nonce = nonce
   retVal.dest = destinationAddress
   return retVal
}


//shouldThrow is if the relayer should throw
//shouldUpdate is if the subcall should throw
async function testMetaTxForwardTo(signingAddr, sendingAddr, txRelay, identityManagerAddress, proxyAddress,
                                   testReg, relayShouldFail, subCallShouldFail, lw, keyFromPw) {
  //Relayer must be a truffle account, while fromAccount must be lightwallet account
  let errorThrown = false
  let testNum = getRandomNumber()
  // Encode the transaction to send to the proxy contract
  let data = enc('register', ['uint256'], [testNum])
  let types = ['address', 'address', 'address', 'uint256', 'bytes']
  let params = [signingAddr, proxyAddress, testReg.address, 0, data]
  // Setup payload for meta-tx
  let p = await signPayload(signingAddr, txRelay, zeroAddress, identityManagerAddress,
                        'forwardTo', types, params, lw, keyFromPw)
  let firstNonce = p.nonce
  // Send forward request from the owner
  try {
    await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sendingAddr})
  } catch (error) {
    errorThrown = true
    //assert.match(error, /revert/, "An error should have been thrown")
  }
  let regData = await testReg.registry.call(proxyAddress)
  if (relayShouldFail) {
    assertThrown(errorThrown, "Transaction should not have gotten through relay")
    assert.notEqual(regData.toNumber(), testNum)
  } else {
    let expectedNonce = firstNonce.toNumber()
    if (subCallShouldFail) {
      assert.notEqual(regData.toNumber(), testNum)
    } else {
      assert.equal(regData.toNumber(), testNum)
      expectedNonce += 1
    }
    p = await signPayload(signingAddr, txRelay, zeroAddress, identityManagerAddress,
                          'forwardTo', types, params, lw, keyFromPw)
    assert.equal(p.nonce.toNumber(), expectedNonce, "Nonce should have updated")
  }
}

async function checkLogs(tx, eventName, indexAddOne, indexAddTwo, notIndexAdd) {
  const log = tx.receipt.logs[0]
  assert.equal(log.topics[0], solsha3(eventName + "(address,address,address)"), "Wrong event")
  assert.equal(log.topics[1], pad(indexAddOne), "Wrong topic one")
  assert.equal(log.topics[2], pad(indexAddTwo), "Wrong topic two")
  assert.equal(log.data, pad(notIndexAdd), "Wrong initiator")
}


contract('TxRelay', (accounts) => {
  let proxy
  let deployedProxy
  let testReg
  let mTestReg //metaTestRegistry
  let identityManager
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
      lw.keyFromPassword("test", async function(e,k) {
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

        errorThrown = false

        txRelay = await MetaTxRelay.new()
        identityManager = await MetaIdentityManager.new(userTimeLock, adminTimeLock, adminRate, txRelay.address)
        deployedProxy = await Proxy.new({from: sender})
        testReg = await TestRegistry.new()
        let tx = await identityManager.createIdentity(user1, recoveryKey, {from: sender})
        const log = tx.logs[0]
        assert.equal(log.event, 'LogIdentityCreated', 'wrong event')
        proxy = Proxy.at(log.args.identity)
        mTestReg = await MetaTestRegistry.new()
        done()
      })
    })
  })

  describe("Meta transactions", () => {
    it('Should forward properly formatted meta tx', async function() {
      types = ['address', 'uint256']
      params = [user1, LOG_NUMBER_1]
      p = await signPayload(user1, txRelay, zeroAddress, mTestReg.address, 'register',
                            types, params, lw, keyFromPw)

      await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

      regData = await mTestReg.registry.call(user1)
      assert.equal(regData.toNumber(), LOG_NUMBER_1, 'Registry did not update')
    })


    it('Should fail if sub-calls may fail', async function() {
      types = ['address']
      params = [user1]
      p = await signPayload(user1, txRelay, zeroAddress, mTestReg.address, 'testThrow',
                            types, params, lw, keyFromPw)

      errorThrown = false
      try {
        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0,
                                        {from: sender, gas: 4500000})
      } catch (e) {
        assert.match(e.message, /revert/, "Should have thrown")
        errorThrown = true
      }
      assertThrown(errorThrown, "Has thrown an error")

      p = await signPayload(user1, txRelay, zeroAddress, mTestReg.address, 'testThrow',
                            types, params, lw, keyFromPw)

      assert.equal(p.nonce, "0", "nonce should not have updated")
    })

    it('Should not forward meta tx from someone lying about address', async function() {
      //User1 encodes user2's address. Still can only sign w/ their own key
      types = ['address', 'uint256']
      params = [user2, LOG_NUMBER_1]
      p = await signPayload(user1, txRelay, zeroAddress, mTestReg.address, 'register',
                            types, params, lw, keyFromPw)

      res = await txRelay.getAddress.call(p.data)
      assert.equal(res, user2, "Address is not first parameter")

      try {
        //claim to be a different person again
        await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
      } catch (e) {
        assert.match(e.message, /revert/, "Should have thrown")
        errorThrown = true;
      }
      assertThrown(errorThrown, "Has thrown an error")

      //Check both address in case in updated one
      regData = await mTestReg.registry.call(user1)
      assert.equal(regData.toNumber(), 0, 'Registry did not update')
      regData = await mTestReg.registry.call(user2)
      assert.equal(regData.toNumber(), 0, 'Registry did not update')
    })

    it('Should not forward meta tx with Ether', async function () {
      types = ['address', 'uint256']
      params = [user1, LOG_NUMBER_1]
      p = await signPayload(user1, txRelay, zeroAddress, mTestReg.address, 'register',
                            types, params, lw, keyFromPw)

      res = await txRelay.getAddress.call(p.data)
      assert.equal(res, user1, "Address is not first parameter")

      try {
        //Send the transaction with 1 Wei
        await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0,
                                  {from: sender, value: 1})
      } catch (e) {
        assert.match(e.message, /Cannot send value to non-payable function/, "Should have thrown")
        errorThrown = true;
      }
      assertThrown(errorThrown, "Should have thrown an error")

      regData = await mTestReg.registry.call(user1)
      assert.equal(regData.toNumber(), 0, 'Registry did not update')
    })

    it('Should not allow a replay attack', async function () {
      types = ['address', 'uint256']
      params = [user1, LOG_NUMBER_1]
      p = await signPayload(user1, txRelay, zeroAddress, mTestReg.address, 'register',
                            types, params, lw, keyFromPw)

      res = await txRelay.getAddress.call(p.data)
      assert.equal(res, user1, "Address is not first parameter")

      await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

      regData = await mTestReg.registry.call(user1)
      assert.equal(regData.toNumber(), LOG_NUMBER_1, 'Registry did not update')

      try {
        //Relayer tries to relay the same transaction twice
        await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
      } catch (e) {
        assert.match(e.message, /revert/, "should have thrown")
        errorThrown = true
      }
      assertThrown(errorThrown, "Should have thrown")
    })

    // Had some weird stuff w/ hex before - not a great test though :@
    it('Should forward meta tx multiple times', async function() {
      let randNum

      for (let i = 0; i < 10; i++) {
        randNum = getRandomNumber()

        types = ['address', 'uint256']
        params = [user1, randNum]
        p = await signPayload(user1, txRelay, zeroAddress, mTestReg.address, 'register',
                              types, params, lw, keyFromPw)

        assert.equal(p.nonce, i.toString(), "Nonce should have updated")
        await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

        regData = await mTestReg.registry.call(user1)
        assert.equal(regData.toNumber(), randNum, 'Registry did not update properly')
      }
    }).timeout(10000000)
  })

  describe("Whitelist", () => {
    let sender1 = accounts[0]
    let sender2 = accounts[1]
    let sender3 = accounts[2]
    let sender4 = accounts[3]
    let sender5 = accounts[4]
    let sender6 = accounts[5]
    let sender7 = accounts[6]
    before(async () => {
      testTxRelay = await MetaTxRelay.new()

    })

    it("Should register a list of addresses to a whitelist", async () => {
      await testTxRelay.addToWhitelist([sender2, sender3], {from: sender1})

      assert.isTrue(await testTxRelay.whitelist.call(sender1, sender2), "sender2 should be on list")
      assert.isTrue(await testTxRelay.whitelist.call(sender1, sender3), "sender3 should be on list")

      assert.isFalse(await txRelay.whitelist.call(sender1, sender1), "sender1 should not be on list")
    })

    it("Should allow owner of list to add another sender", async () => {
      await testTxRelay.addToWhitelist([sender4], {from: sender1})

      assert.isTrue(await testTxRelay.whitelist.call(sender1, sender2), "sender2 should be on list")
      assert.isTrue(await testTxRelay.whitelist.call(sender1, sender3), "sender3 should be on list")
      assert.isTrue(await testTxRelay.whitelist.call(sender1, sender4), "sender4 should be on list")
    })

    it("Should not allow non-owner to add another sender", async () => {
      await testTxRelay.addToWhitelist([sender5], {from: sender2})

      assert.isFalse(await txRelay.whitelist.call(sender1, sender5), "sender5 should not be on list")
    })

    it("Should allow owner of list to remove senders", async () => {
      await testTxRelay.removeFromWhitelist([sender4, sender3], {from: sender1})

      assert.isTrue(await testTxRelay.whitelist.call(sender1, sender2), "sender2 should be on list")
      assert.isFalse(await testTxRelay.whitelist.call(sender1, sender3), "sender3 not should be on list")
      assert.isFalse(await testTxRelay.whitelist.call(sender1, sender4), "sender4 not should be on list")
    })

    it("Removing sender not on list should not have an effect", async () => {
      assert.isFalse(await testTxRelay.whitelist.call(sender1, sender3), "sender3 not should be on list")

      await testTxRelay.removeFromWhitelist([sender3], {from: sender1})

      assert.isFalse(await testTxRelay.whitelist.call(sender1, sender3), "sender3 not should be on list")
    })

    it("Should allow another sender to create their own whitelist", async () => {
      await testTxRelay.addToWhitelist([sender6, sender7], {from: sender2})

      assert.isFalse(await testTxRelay.whitelist.call(sender2, sender2), "sender2 should not be on list")
      assert.isFalse(await testTxRelay.whitelist.call(sender2, sender3), "sender3 should not be on list")
      assert.isFalse(await testTxRelay.whitelist.call(sender2, sender4), "sender4 should not be on list")
      assert.isTrue(await testTxRelay.whitelist.call(sender2, sender6), "sender6 should be on list")
      assert.isTrue(await testTxRelay.whitelist.call(sender2, sender7), "sender7 should be on list")
    })

    it("Should send tx if sender is in whitelist", async () => {
      types = ['address', 'uint256']
      params = [user1, LOG_NUMBER_1]
      p = await signPayload(user1, testTxRelay, sender1, mTestReg.address, 'register',
                            types, params, lw, keyFromPw)

      await testTxRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, sender1, {from: sender2})

      regData = await mTestReg.registry.call(user1)
      assert.equal(regData.toNumber(), LOG_NUMBER_1, 'Registry did not update')
    })

    it("Should throw if sender is not in whitelist", async () => {
      types = ['address', 'uint256']
      params = [user1, LOG_NUMBER_1]
      p = await signPayload(user1, testTxRelay, sender1, mTestReg.address, 'register',
                            types, params, lw, keyFromPw)

      errorThrown = false
      try {
        await testTxRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, sender1, {from: sender3})
      } catch (e) {
        assert.match(e.message, /revert/, "Should have thrown")
        errorThrown = true
      }
      assertThrown(errorThrown, "Has thrown an error")
    })

    it("Should throw if sender is in incorrect whitelist", async () => {
      types = ['address', 'uint256']
      params = [user1, LOG_NUMBER_1]
      p = await signPayload(user1, testTxRelay, sender2, mTestReg.address, 'register',
                            types, params, lw, keyFromPw)

      errorThrown = false
      try {
        await testTxRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, sender2, {from: sender2})
      } catch (e) {
        assert.match(e.message, /revert/, "Should have thrown")
        errorThrown = true
      }
      assertThrown(errorThrown, "Has thrown an error")
    })
  })

  describe("Meta-tx with IdentityManager", () => {
    describe("existing identity", () => {
      it("allow transactions initiated by owner", async function () {
        await testMetaTxForwardTo(user1, sender, txRelay, identityManager.address,
                            proxy.address, testReg, false, false, lw, keyFromPw)
      })

      it("don't allow transactions initiated by non owner", async function () {
        await testMetaTxForwardTo(user2, sender, txRelay, identityManager.address, proxy.address,
                                  testReg, false, true, lw, keyFromPw)
      })

      it("owner can add other owner", async function () {
        types = ['address', 'address', 'address']
        params = [user1, proxy.address, user2]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'addOwner', types, params, lw, keyFromPw)

        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

        await checkLogs(tx, "LogOwnerAdded", proxy.address, user2, user1)
      })

      it("owner is rateLimited in adding/removing owners and recoveryKey", async function () {
        //First, user1 adds user2 as a new owner
        types = ['address', 'address', 'address']
        params = [user1, proxy.address, user2]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'addOwner', types, params, lw, keyFromPw)

        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

        await checkLogs(tx, "LogOwnerAdded", proxy.address, user2, user1)
        //Then, user1 tries to add user3 as a new owner
        params = [user1, proxy.address, user3]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'addOwner', types, params, lw, keyFromPw)

        errorThrown = false
        try {
          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender, gas: 4500000})
        } catch (e) {
          assert.match(e.message, /revert/, "Should have thrown")
          errorThrown = true
        }

        //Tries to change the recoveryKey
        params = [user1, proxy.address, recoveryKey2]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'changeRecovery', types, params, lw, keyFromPw)

        errorThrown = false
        try {
          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender, gas: 4500000})
        } catch (e) {
          assert.match(e.message, /revert/, "Should have thrown")
          errorThrown = true
        }

        //Then have user1 try to remove user2 - still is rateLimited
        params = [user1, proxy.address, user2]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'removeOwner', types, params, lw, keyFromPw)

        errorThrown = false
        try {
          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        } catch (e) {
          assert.match(e.message, /revert/, "Should have thrown")
          errorThrown = true
        }

        //Make them no longer rateLimited
        await evm_increaseTime(adminRate + 1)
        //Have them add user3, sucessfull this time
        params = [user1, proxy.address, user3]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'addOwner', types, params, lw, keyFromPw)

        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender, gas: 4500000})
        await checkLogs(tx, "LogOwnerAdded", proxy.address, user3, user1)

        //Try to remove owner two again, should fail
        params = [user1, proxy.address, user2]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'removeOwner', types, params, lw, keyFromPw)

        errorThrown = false
        try {
          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender, gas: 4500000})
        } catch (e) {
          assert.match(e.message, /revert/, "Should have thrown")
          errorThrown = true
        }

        //Tries to change the recoveryKey
        params = [user1, proxy.address, recoveryKey2]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'changeRecovery', types, params, lw, keyFromPw)

        errorThrown = false
        try {
          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender, gas: 4500000})
        } catch (e) {
          assert.match(e.message, /revert/, "Should have thrown")
          errorThrown = true
        }

        //Unrate limit them again
        await evm_increaseTime(adminRate + 1)

        params = [user1, proxy.address, user2]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'removeOwner', types, params, lw, keyFromPw)

        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        await checkLogs(tx, "LogOwnerRemoved", proxy.address, user2, user1)

        //Tries to change the recoveryKey
        params = [user1, proxy.address, recoveryKey2]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'changeRecovery', types, params, lw, keyFromPw)

        errorThrown = false
        try {
          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender, gas: 4500000})
        } catch (e) {
          assert.match(e.message, /revert/, "Should have thrown")
          errorThrown = true
        }

        //Unrate limit them again
        await evm_increaseTime(adminRate + 1)
        //Tries to change the recoveryKey
        params = [user1, proxy.address, recoveryKey2]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'changeRecovery', types, params, lw, keyFromPw)

        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        await checkLogs(tx, "LogRecoveryChanged", proxy.address, recoveryKey2, user1)
      }).timeout(10000000)

      it("non-owner can not add other owner", async function () {
        types = ['address', 'address', 'address']
        params = [user3, proxy.address, user4]
        p = await signPayload(user3, txRelay, zeroAddress, identityManager.address,
                              'addOwner', types, params, lw, keyFromPw)

        res = await txRelay.getAddress.call(p.data)
        assert.equal(res, user3, "Address is not first parameter")

        errorThrown = false
        try {
          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        } catch (e) {
          assert.match(e.message, /revert/, "Should have thrown")
          errorThrown = true
        }
      })

      describe("new owner added by owner", () => {
        beforeEach(async function () {
          types = ['address', 'address', 'address']
          params = [user1, proxy.address, user2]
          p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                                'addOwner', types, params, lw, keyFromPw)

          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

          await checkLogs(tx, "LogOwnerAdded", proxy.address, user2, user1)
        })

        it("within userTimeLock is allowed transactions", async function () {
          await testMetaTxForwardTo(user2, sender, txRelay, identityManager.address, proxy.address,
                                    testReg, false, false, lw, keyFromPw)
        })

        describe("after userTimeLock", () => {
          beforeEach(async function () {
              await evm_increaseTime(userTimeLock + 1)
          })

          it("Allow transactions", async function () {
            await testMetaTxForwardTo(user2, sender, txRelay, identityManager.address, proxy.address,
                                      testReg, false, false, lw, keyFromPw)
          })

          it("can not add other owner yet", async function () {
            types = ['address', 'address', 'address']
            params = [user2, proxy.address, user3]
            p = await signPayload(user2, txRelay, zeroAddress, identityManager.address,
                                  'addOwner', types, params, lw, keyFromPw)

            res = await txRelay.getAddress.call(p.data)
            assert.equal(res, user2, "Address is not first parameter")

            errorThrown = false
            try {
              tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
            } catch (e) {
              assert.match(e.message, /revert/, "Should have thrown")
              errorThrown = true
            }
          })

          it("can not remove other owner yet", async function () {
            types = ['address', 'address', 'address']
            params = [user2, proxy.address, user1]
            p = await signPayload(user2, txRelay, zeroAddress, identityManager.address,
                                  'removeOwner', types, params, lw, keyFromPw)

            res = await txRelay.getAddress.call(p.data)
            assert.equal(res, user2, "Address is not first parameter")

            errorThrown = false
            try {
              tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
            } catch (e) {
              assert.match(e.message, /revert/, "Should have thrown")
              errorThrown = true
            }
          })

          it("can not change recoveryKey yet", async function () {
            types = ['address', 'address', 'address']
            params = [user2, proxy.address, recoveryKey2]
            p = await signPayload(user2, txRelay, zeroAddress, identityManager.address,
                                  'changeRecovery', types, params, lw, keyFromPw)

            res = await txRelay.getAddress.call(p.data)
            assert.equal(res, user2, "Address is not first parameter")

            errorThrown = false
            try {
              tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
            } catch (e) {
              assert.match(e.message, /revert/, "Should have thrown")
              errorThrown = true
            }
          })
        })

        describe("after adminTimeLock", () => {
          beforeEach(async function () {
              await evm_increaseTime(adminTimeLock + 1)
          })

          it("can add new owner", async function () {
            types = ['address', 'address', 'address']
            params = [user2, proxy.address, user3]
            p = await signPayload(user2, txRelay, zeroAddress, identityManager.address,
                                  'addOwner', types, params, lw, keyFromPw)

            tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

            await checkLogs(tx, "LogOwnerAdded", proxy.address, user3, user2)
          })

          it("can remove other owner", async function () {
            types = ['address', 'address', 'address']
            params = [user2, proxy.address, user3]
            p = await signPayload(user2, txRelay, zeroAddress, identityManager.address,
                                  'removeOwner', types, params, lw, keyFromPw)

            tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

            await checkLogs(tx, "LogOwnerRemoved", proxy.address, user3, user2)
          })

          it("can change recoveryKey", async function () {
            types = ['address', 'address', 'address']
            params = [user2, proxy.address, recoveryKey2]
            p = await signPayload(user2, txRelay, zeroAddress, identityManager.address,
                                  'changeRecovery', types, params, lw, keyFromPw)

            tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

            await checkLogs(tx, "LogRecoveryChanged", proxy.address, recoveryKey2, user2)
          })
        })
      })
      describe("new owner added by recoveryKey", () => {
        beforeEach(async function () {
          types = ['address', 'address', 'address']
          params = [recoveryKey, proxy.address, user4] //new owner
          p = await signPayload(recoveryKey, txRelay, zeroAddress, identityManager.address,
                                'addOwnerFromRecovery', types, params, lw, keyFromPw)

          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

          await checkLogs(tx, "LogOwnerAdded", proxy.address, user4, recoveryKey)
        })

        it('recovery key is rateLimited', async function () {
          types = ['address', 'address', 'address']
          params = [recoveryKey, proxy.address, user4] //new owner
          p = await signPayload(recoveryKey, txRelay, zeroAddress, identityManager.address,
                                'addOwnerFromRecovery', types, params, lw, keyFromPw)

          errorThrown = false
          try {
            tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender, gas: 4500000})
          } catch (e) {
            assert.match(e.message, /revert/, "Should have thrown")
            errorThrown = true
          }
        })

        it("within userTimeLock is not allowed transactions", async function () {
          await testMetaTxForwardTo(user4, sender, txRelay, identityManager.address, proxy.address,
                                    testReg, false, true, lw, keyFromPw)
        })

        describe("after userTimeLock", () => {
          it("Allow transactions", async function () {
            await evm_increaseTime(userTimeLock + 1)
            await testMetaTxForwardTo(user4, sender, txRelay, identityManager.address, proxy.address,
                                      testReg, false, false, lw, keyFromPw)
          }).timeout(10000000)
        })

        describe("after adminTimeLock", () => {
          beforeEach(async function () {
            await evm_increaseTime(adminTimeLock + 1)
          })

          it("can add new owner", async function () {
            types = ['address', 'address', 'address']
            params = [user4, proxy.address, user3]
            p = await signPayload(user4, txRelay, zeroAddress, identityManager.address,
                                  'addOwner', types, params, lw, keyFromPw)

            tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

            await checkLogs(tx, "LogOwnerAdded", proxy.address, user3, user4)
          })

          it("can remove other owner", async function () {
            types = ['address', 'address', 'address']
            params = [user4, proxy.address, user3]
            p = await signPayload(user4, txRelay, zeroAddress, identityManager.address,
                                  'removeOwner', types, params, lw, keyFromPw)

            tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

            await checkLogs(tx, "LogOwnerRemoved", proxy.address, user3, user4)
          })

          it("can change recoveryKey", async function () {
            types = ['address', 'address', 'address']
            params = [user4, proxy.address, recoveryKey2]
            p = await signPayload(user4, txRelay, zeroAddress, identityManager.address,
                                  'changeRecovery', types, params, lw, keyFromPw)

            tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

            await checkLogs(tx, "LogRecoveryChanged", proxy.address, recoveryKey2, user4)
          })
        })
      })
    })
    describe("migration", () => {
      let newIdenManager
      beforeEach(async function () {
        newIdenManager = await MetaIdentityManager.new(userTimeLock, adminTimeLock, adminRate, txRelay.address)
        //Make user2 a young owner.
        types = ['address', 'address', 'address']
        params = [user1, proxy.address, user2]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'addOwner', types, params, lw, keyFromPw)

        res = await txRelay.getAddress.call(p.data)
        assert.equal(res, user1, "Address is not first parameter")

        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

        await checkLogs(tx, "LogOwnerAdded", proxy.address, user2, user1)
      })

      it("older owner can start transfer", async function () {
        types = ['address', 'address', 'address']
        params = [user1, proxy.address, newIdenManager.address]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'initiateMigration', types, params, lw, keyFromPw)
        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

        await checkLogs(tx, "LogMigrationInitiated", proxy.address, newIdenManager.address, user1)
      })

      it("young owner should not be able to start transfer", async function () {
        types = ['address', 'address', 'address']
        params = [user2, proxy.address, newIdenManager.address]
        p = await signPayload(user2, txRelay, zeroAddress, identityManager.address,
                              'initiateMigration', types, params, lw, keyFromPw)

        errorThrown = false
        try {
          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        } catch (e) {
          assert.match(e.message, /revert/, "Should have thrown")
          errorThrown = true
        }
      })

      it("non-owner should not be able to start transfer", async function () {
        types = ['address', 'address', 'address']
        params = [user3, proxy.address, newIdenManager.address]
        p = await signPayload(user3, txRelay, zeroAddress, identityManager.address,
                              'initiateMigration', types, params, lw, keyFromPw)

        errorThrown = false
        try {
          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        } catch (e) {
          assert.match(e.message, /revert/, "Should have thrown")
          errorThrown = true
        }
      })

      it("correct keys can cancel migration ", async function () {
        //Start migration
        types = ['address', 'address', 'address']
        params = [user1, proxy.address, newIdenManager.address]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'initiateMigration', types, params, lw, keyFromPw)
        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        await checkLogs(tx, "LogMigrationInitiated", proxy.address, newIdenManager.address, user1)

        //Non-owner tries to cancel
        types = ['address', 'address']
        params = [user3, proxy.address]
        p = await signPayload(user3, txRelay, zeroAddress, identityManager.address,
                              'cancelMigration', types, params, lw, keyFromPw)
        errorThrown = false
        try {
          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        } catch (e) {
          assert.match(e.message, /revert/, "Should have thrown")
          errorThrown = true
        }

        //Young owner tries to cancel
        params = [user2, proxy.address]
        p = await signPayload(user2, txRelay, zeroAddress, identityManager.address,
                              'cancelMigration', types, params, lw, keyFromPw)
        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        await checkLogs(tx, "LogMigrationCanceled", proxy.address, newIdenManager.address, user2)

        await evm_increaseTime(adminTimeLock + 1)
        //Start migration again
        types = ['address', 'address', 'address']
        params = [user1, proxy.address, newIdenManager.address]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'initiateMigration', types, params, lw, keyFromPw)
        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        await checkLogs(tx, "LogMigrationInitiated", proxy.address, newIdenManager.address, user1)

        //Older owner tries to cancel.
        types = ['address', 'address']
        params = [user1, proxy.address]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'cancelMigration', types, params, lw, keyFromPw)
        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        await checkLogs(tx, "LogMigrationCanceled", proxy.address, newIdenManager.address, user1)
      }).timeout(10000000)

      it("correct keys should finilize transfer", async function () {
        //Start migration
        types = ['address', 'address', 'address']
        params = [user1, proxy.address, newIdenManager.address]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'initiateMigration', types, params, lw, keyFromPw)
        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

        await checkLogs(tx, "LogMigrationInitiated", proxy.address, newIdenManager.address, user1)

        //Non-owner tries to finalize
        types = ['address', 'address']
        params = [user3, proxy.address]
        p = await signPayload(user3, txRelay, zeroAddress, identityManager.address,
                              'finalizeMigration', types, params, lw, keyFromPw)
        errorThrown = false
        try {
          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        } catch (e) {
          assert.match(e.message, /revert/, "Should have thrown")
          errorThrown = true
        }

        //Young owner tries to finalize
        params = [user2, proxy.address]
        p = await signPayload(user2, txRelay, zeroAddress, identityManager.address,
                              'finalizeMigration', types, params, lw, keyFromPw)
        errorThrown = false
        try {
          tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        } catch (e) {
          assert.match(e.message, /revert/, "Should have thrown")
          errorThrown = true
        }

        await evm_increaseTime(adminTimeLock + 1)

        //Older owner tries to finalize, and succedes.
        params = [user1, proxy.address]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'finalizeMigration', types, params, lw, keyFromPw)
        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

        await checkLogs(tx, "LogMigrationFinalized", proxy.address, newIdenManager.address, user1)
      }).timeout(10000000)

      it("should be owner of new identityManager after successful transfer", async function () {
        //Start migration
        types = ['address', 'address', 'address']
        params = [user1, proxy.address, newIdenManager.address]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'initiateMigration', types, params, lw, keyFromPw)
        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

        await checkLogs(tx, "LogMigrationInitiated", proxy.address, newIdenManager.address, user1)

        //setup new identitymanage to receive
        data = enc('registerIdentity', ['address', 'address'], [user1, recoveryKey])
        types = ['address', 'address', 'address', 'uint256', 'bytes']
        params = [user1, proxy.address, newIdenManager.address, 0, data]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'forwardTo', types, params, lw, keyFromPw)

        res = await txRelay.getAddress.call(p.data)
        assert.equal(res, user1, "Address is not first parameter")
        await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

        //Allow for transfer to finalize
        await evm_increaseTime(adminTimeLock + 1)

        types = ['address', 'address']
        params = [user1, proxy.address]
        p = await signPayload(user1, txRelay, zeroAddress, identityManager.address,
                              'finalizeMigration', types, params, lw, keyFromPw)
        tx = await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})

        await checkLogs(tx, "LogMigrationFinalized", proxy.address, newIdenManager.address, user1)

        //Setup data and sign
        data = enc('register', ['uint256'], [LOG_NUMBER_1])
        types = ['address', 'address', 'address', 'uint256', 'bytes']
        params = [user1, proxy.address, testReg.address, 0, data]
        p = await signPayload(user1, txRelay, zeroAddress, newIdenManager.address,
                              'forwardTo', types, params, lw, keyFromPw)

        res = await txRelay.getAddress.call(p.data)
        assert.equal(res, user1, "Address is not first parameter")

        await txRelay.relayMetaTx(p.v, p.r, p.s, p.dest, p.data, 0, {from: sender})
        regData = await testReg.registry.call(proxy.address)
        assert.equal(regData.toNumber(), LOG_NUMBER_1, 'Registry did not update properly')
      }).timeout(10000000)
    })
  })

  it('Should not approve bad data', async function () {
    //This function needs some serious thought + testing
    let t = ['address', 'address', 'address', 'uint256', 'bytes'] //types
    let p = [user1, proxy.address, testReg.address, 0, []] //params
    let n = "forwardTo" //name of function

    //encoded correctly
    data = enc(n, t, p)
    res = await txRelay.getAddress.call(data)
    assert.equal(res, user1, "Address is not first parameter")
    //off by a nibble
    data = enc(n, t, p).slice(1)
    res = await txRelay.getAddress.call(data)
    assert.notEqual(res, user1, "Address is first parameter, should be shifted off")
    //short
    data = enc(n, t, p).substring(0, 16)
    res = await txRelay.getAddress.call(data)
    assert.notEqual(res, user1, "Address is first parameter, should be too short")
    //wrong address
    let badParam = [user2, proxy.address, testReg.address, 0, []]
    data = enc(n, t, badParam)
    res = await txRelay.getAddress.call(data)
    assert.notEqual(res, user1, "Address is first parameter, should be someone else")
    //first half of address
    data = enc(n, t, p).substring(0, 26) + zero
    res = await txRelay.getAddress.call(data)
    assert.notEqual(res, user1, "Address is first parameter, should be too short")
  })
})
