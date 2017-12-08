# MetaIdentityManager
The MetaIdentityManager has the same functionality as [IdentityManager](./identityManager.md) but with the addition of being able to send meta transactions (meta-tx).

## Requirements
The MetaIdentityManager should be able to perform the following actions:
* Everything that the [IdentityManager](./identityManager.md) can do
* Allow the user to send meta-tx

## Design
The interface of the MetaIdentityManager is the same as [IdentityManager](./identityManager.md) with some small changes to be able to use the [TxRelay](./txRelay.md). Namely adding sender as the first parameters of all authenticated methods, as well as a `onlyAuthorized` modifier. Also note that a user can both send meta-tx and regular tx to the MetaIdentityManager.

## Attacks
See [IdentityManager](./identityManager.md), should have the same possible attack scenarios.
