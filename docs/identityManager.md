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

