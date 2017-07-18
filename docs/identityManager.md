# IdentityManager
IdentityManager is a controller contract for [Proxy](./proxy.md) contracts that is shared between users. This minimizes gas costs compared to each user having to have their own separate controller for their proxy, while still allowing the user to have full control over their own proxy. The IdentityManager also gives the user the power to control the proxy from multiple devices.

## Requirements
The IdentityManager should be able to perform the following actions:
* Identity Creation
    - Allow users to create a new proxy through the IdentityManager
    - Allow users to transfer an old proxy to the IdentityManager
* Use
    - Relay a tx to proxy
    - Adding of new owners
    - Removal of owners
    - Recovering from loss of all owner keys
    - Changing recovery
    - Transferring ownership of proxy away from IdentityManager

## Design
The IdentityManager contract has any number of owners and one recovery key for each proxy. It also has rate limits for each caller on some of the functions. Proxies can be created, transfered to and from the IdentityManager. Owners can be added and removed, the recovery key can be changed.

## Attacks
A user should not lose access to their proxy contract. Thus, the IdentityManager should be robust during the following scenarios.

#### Actors

* Alice - Identity Owner
* Malory - Malicious user

#### Scenarios
Assume that Alice has at least two keys that she controls on two different devices.

* Alice looses phone
    * Alice's Actions
        * Alice calls `removeOwner` with her other device.
    * Malory's Actions
        * If Malory can break into the lost device, she will be able to view the uPort identity but not do anything to the identity as it requires TouchID
        * If Malory can jailbreak the phone, she will be unable to retrieve the owner key, as it is encrypted
        * If Malory somehow manages to get into the phone before Alice can remove it, then Alice will lose her identity :(.
* Alice looses recovery key (seed)
    * Alice's Actions
        * If Alice realizes she lost her recovery seed, she calls `changeRecovery` from either of her devices.
        * If Alice does not realize she lost her seed (meaning Malory has found it but Alice does not realize she has it), then Alice does nothing. This is addressed below.
    * Malory's Actions
        * If Malory is able to use recoveryKey before Alice can remove it, she calls addOwnerFromRecovery with an address she controls
            * New evil owner will be able to transact from identity after `userTimeLock` unless Alice acts
            * New evil owner will be able to remove other owners from identity after `adminTimeLock` unless Alice acts
            * Note: In the case where Malory performs this action, an OwnerAdded event will be triggered, and thus Alice should be notified that this is occurring. As long as she realizes before `adminTimeLock`, she can delete both the new evil owner and the evil recovery.


### Analysis of number of bad vs good owners
This is going to analyze the security of the IdentityManager with from 1-5 owners, as well as different assumptions about the good-ness of the recoveryKey. Not super rigorous, but might be interesting, so take with grain of salt.

The formulas are more-or-less close. They at least work for smaller numbers of owners :).

#### Assumptions
1. Evil owner will always follow an optimal strategy
2. Evil owner all can coordinate, and censoring communication between them is impossible
3. Evil owner acts first

#### Goals
1. Maximize the number of owners that can fail an have the owner retain control of identity.

#### With Good Recovery:  ceiling(numOwners / 2 - 1) can be evil, and identity is safe.
**1 Owner:**
Max # of Evil Owners: 0
Reason: Evil owner can immediately replace recoveryKey.

**2 Owners:**
Max # of Evil Owners: 0
Reason: A single evil owner could delete the good owner. Then, the recoveryKey would try and add a new, good owner. However, as the evil owner acted first, they would be able to delete this new owner before they could act (owner added by recovery has to wait adminTimeLock before they can act).

**3 Owners:**
Max # of Evil Owners: 1
Reason: Evil owner removes good owner, remaining good owner removes bad owner. However, if there are 2 evil owners, could remove the recoveryKey and the good owner.

**4 Owners:**
Max # of Evil Owners: 1
Reason: Evil owner removes one of the three good owners. One of remaining two good owners removes bad owner.

However, if there were 2 bad owners, then they would remove two of the good owners. The recovery would try and add a new good owner, but this owner would become active to late - and would be deleted (along w/ the recoveryKey) when two bad owners could.

**5 Owners:**
Max # of Evil Owners: 2
Reason: 2 evil owners would delete 2 good owners. Remaining good owner would delete one bad owner, and recovery would add good owner. Old good owner would be deleted as soon as bad owner was no longer limited, but then the newly added owner would delete the bad owner. 3 evil owners would just delete 2 good owners and recovery.


#### With Evil Recovery: max(0, ceiling((numOwners - 1)/ 2 - 1) can be evil, and identity be safe.
**1 Owner:**
Max # of Evil Owners: 0
Reason: Evil owner can immediately replace

**2 Owners:**
Max # of Evil Owners: 0
Reason: Evil owner can immediately delete good owner.

**3 Owners:**
Max # of Evil Owners: 0
Reason: If there is an evil owner, they can delete one of the good owners, and then the remaining good owner has to delete them. Before good owner can, new evil owner is added by recovery. Thus, this identity will be active before one good identity is no longer rate limited, and thus this new evil owner will delete old owner.

**4 Owners:**
Max # of Evil Owners: 1
Reason: If there is one evil owner, they can delete an good owner while a recovery adds new bad owner. These two evil owners are removed by the two remaining good owners. The recovery will then be able add another evil owner. However, these will both be removed by good owners.

If there are 2, can remove 2 good owners immediately.

**5 Owners:**
Max # of Evil Owners: 1
Reason: Evil owner removes 1 of 4 good while recovery adds new evil owner. 3 remaining delete evil, recovery, and newly added evil.

If there are two, can remove 2 good owners. 1 good remaining removes 1 evil, leaving 1 evil. This evil can then remove the good.

