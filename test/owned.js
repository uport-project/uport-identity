const Owned = artifacts.require('Owned')

contract('Owned', (accounts) => {
  let owned

  before(async function() {
    owned = await Owned.new({from: accounts[0]})
  })

  it('Is owned by creator', async function() {
    let isOwner = await owned.isOwner.call(accounts[0])
    assert.isTrue(isOwner, 'Owner should be owner')
    isOwner = await owned.isOwner.call(accounts[1])
    assert.isFalse(isOwner, 'Non-owner should not be owner')
  })

  it('Non-owner can not change owner', async function() {
    try {
      await owned.transfer(accounts[1], {from: accounts[1]})
    } catch (e) {
      errorThrown = true
    }
    assert.isTrue(errorThrown, 'An error should have been thrown')
    let isOwner = await owned.isOwner.call(accounts[1])
    assert.isFalse(isOwner, 'Owner should not be changed')
  })

  it('Owner can change owner', async function() {
    await owned.transfer(accounts[1], {from: accounts[0]})
    let isOwner = await owned.isOwner.call(accounts[1])
    assert.isTrue(isOwner, 'Owner should be changed')
  })

  it('Owner can not change owner to proxy address', async function() {
    await owned.transfer(owned.address, {from: accounts[1]})
    let isOwner = await owned.isOwner.call(owned.address)
    assert.isFalse(isOwner, 'Owner should not be changed')
  })
})
