const Owned = artifacts.require('Owned')
const assertThrown = require('./utils/assertThrown')

contract('Owned', (accounts) => {
  let owned
  const owner = accounts[0]
  const creator = accounts[0]
  const nonOwner = accounts[1]
  const toBeOwner = accounts[2]

  beforeEach(async function() {
    owned = await Owned.new({from: creator})
  })

  it('Is initially owned by creator', async function() {
    let isOwner = await owned.isOwner.call(creator)
    assert.isTrue(isOwner, 'Owner should be owner')
  })

  it('Is initially not owned by non creator', async function() {
    isOwner = await owned.isOwner.call(nonOwner)
    assert.isFalse(isOwner, 'Non-owner should not be owner')
  })

  it('Non-owner can not change owner', async function() {
    errorThrown = false
    try {
      await owned.transfer(nonOwner, {from: nonOwner})
    } catch (e) {
      errorThrown = true
    }
    assertThrown(errorThrown, 'An error should have been thrown')
    let isOwner = await owned.isOwner.call(nonOwner)
    assert.isFalse(isOwner, 'Owner should not be changed')
  })

  it('Owner can change owner', async function() {
    await owned.transfer(toBeOwner, {from: owner})
    let isOwner = await owned.isOwner.call(toBeOwner)
    assert.isTrue(isOwner, 'Owner should be changed')
  })

  it('Owner can not change owner to proxy address', async function() {
    await owned.transfer(owned.address, {from: owner})
    let isOwner = await owned.isOwner.call(owned.address)
    assert.isFalse(isOwner, 'Owner should not be changed')
  })
})
