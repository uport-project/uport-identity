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

The main purpose of the IdentityManager is to create a proxy contract representing an identity and allow the user to forward transactions through this proxy contract using one or more *owners* (which could be keys or potentially other smart contracts). This allows us to have a persistent identifier (the address of the proxy contract) while being able to revoke and rotate individual keys, and to use a recovery key to restore access if a device is lost.

The IdentityManager contract has any number of owners and one recovery key for each proxy. It also has rate limits for each caller on some of the functions. Proxies can be created, transfered to and from the IdentityManager. Owners can be added and removed, the recovery key can be changed.

The recovery key can be used to add a new owner to an identity. An owner can also add new owners.

If an owner has been added, the new owner needs to wait `userTimeLock` seconds before it can be used to send transactions through the proxy. The new owner needs to wait `adminTimeLock` seconds before it can perform administrative tasks like adding or removing an owner, or changing the recovery key.

Whenever an owner has performed an administrative task, such as adding or removing an owner, or changing the recovery key, a timer is set so that they need to wait `adminRate` seconds before performing another administrative task.

## Description of functions

### Constructor `IdentityManager`

The constructor function initializes the timeout parameters `userTimeLock`, `adminTimeLock` and `adminRate`. These are defined as follows:

* `userTimeLock`: When an owner has been added they need to wait this long in order to be able to send transactions.
* `adminTimeLock`: When an owner has been added they need to wait this long in order to perform administrative tasks (adding and removing new owners, or change recovery key).
* `adminRate`: When an owner performs an administrative task they need to wait this long in order to be able to perform an administrative task again.

### `createIdentity`

Creates a new proxy contract, and sets its owner to `owner` and recovery key to `recoveryKey`. The timestamp for this owner is set to `now-adminTimeLock` in order to make sure that it will have admin rights immediately.

### `registerIdentity`

Used to transfer control of existing proxy contract from outside the IdentityManager to the IdentityManager. Same setup as for `createIdentity`. This function needs to be called from the proxy itself.

### `forwardTo`

Allows an Owner to forward a transaction through the proxy contract.

### `addOwner`

Allows an Owner to add another Owner. Note that this new Owner is able to transact immediately, unlike an Owner that is added using the RecoveryKey.

### `addOwnerFromRecovery`

Allows the Recovery Key to add a new owner in order to regain control over the identity. An owner added by the Recovery key needs to wait `userTimeLock` seconds before it can forward transactions through the proxy.

### `removeOwner`

Allows an “older” owner (i.e. with admin privilege) to remove another owner. 

### `changeRecovery`

Allows an owner to replace the Recovery Key with another one.

### `initiateMigration`, `finalizeMigration`, `cancelMigration`

Lets an owner initiate the process of migrating a proxy contract away from the IdentityManager to a new one. There is a time limit of `adminTimeLock` after which the migration can be finalized using `finalizeMigration`. Any owner can call `cancelMigration` at any time to cancel the migration.

WARNING: Since all owners are stored in a mapping the `finalizeMigration` method can only remove the owner that is calling the function. This means that any other owners will still be present if the same proxy is migrated back to this IdentityManager again. To be sure this doesn't happen `removeOwner` can be called on all other owners before the call to `finalizeMigration`.

### `isOwner`

Returns true if `owner` is an owner of `identity` and is older than `userTimeLock`.

### `isOlderOwner`

Returns true if `owner` is an owner of `identity` and is older than `adminTimeLock`

### `isRecovery`

Returns true if `recoveryKey` is the recoveryKey of `identity`.

## Values of constants
There are three constants that needs to be set when creating this contract. All of these constants are specified in seconds.
```
_userTimeLock - Time before new owner added by recovery can control proxy
_adminTimeLock - Time before new owner can add/remove owners
_adminRate - Time period used for rate limiting a given key for admin functionality
```

The values we have chosen for these constants are given below.

|Constant|Value|
| --|--|
|_userTimeLock|3600 (1 hour)|
|_adminTimeLock|129600 (1.5 days)|
|_adminRate|1200 (20 minutes)|

These values gives an OlderOwner the ability to recover from a stolen recoveryKey. If a stolen recoveryKey is used to add a user, that user will be able to transact from the proxy after 1 h, but won't be able to remove other users etc until 1.5 days have passed. An adminRate of 20 minutes gives the admin enought time to first remove the stolen recoveryKey and then remove the malicious owner added by the stolen recoveryKey before the new owner will become an OlderOwner. The adminRate simply limits the amount of "admin actions" an OlderOwner can make in a given time period. So for example if the OlderOwner adds a new owner, it can't remove that owner until adminRate has passed. The recoveryKey is also affected by this rate and can only add new owners at a rate of adminRate.


The negative implications on these values on UX is the following:
* after recovery you won't be able to make transactions for 1h
* after you have created your identity you'd have to wait 1.5 days to add a new device (user)

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

## Measures in case of bugs
If a critical bug is discovered in the IdentityManager we basically have one option. Since this contract needs to be trustless there should not be any way for us to upgrading it without users knowing about it. Instead we rely on the `Migration` functionality to move user to a new contract where the bug is fixed. This can be done with a simple confirmation from the user in the uPort client app. If a bug is discovered in the `Migration` functionality itself, the user will have no way of migrating away from the IdentityManager.

If you have found a critical bug in this or any other of our contracts please report it to team@uport.me
