# uPort
Please read our [Whitepaper](http://whitepaper.uport.me) for information on what uPort is, and what is currently possible as far as integration.

## Contracts
This repository contains the contracts currently in use by uPort. This is also where you find the addresses of these contracts currently deployed on Ropsten and Mainnet.

### IdentityFactory

### Proxy
This is the main identity contract. All your transactions are forwarded through this contract which acts as your persistent identifier.

### RecoverableController
This is a controller which plugs in to the proxy contract. It gives you the ability to have one key that can make transactions through the proxy, but can't change the owner of the proxy, and another key that acts as a recovery key that can change the owner of the proxy. This gives you the ability to store a recovery key in cold storage while you can use your main key for regular transactions. If your main key is lost you can change it using the recovery key from cold storage.

### RecoveryQuorum
This contract plugs into the RecoverableController to provide recovery with a n-of-m setup. This allows for creating recovery networks consisting of your friends.

## Contributing
Want to contribute to uport-contracts? Cool, please read our [contribution guidelines](./CONTRIBUTING.md) to get an understanding of the process we use for making changes to this repo.
