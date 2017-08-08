# uPort Identity Contracts
[![npm](https://img.shields.io/npm/v/npm.svg)](https://www.npmjs.com/package/uport-identity)
![CircleCI](https://img.shields.io/circleci/project/github/uport-project/uport-identity.svg)
<coverage>
Please read our [Whitepaper](http://whitepaper.uport.me) for information on what uPort is, and what is currently possible as far as integration.

<contract-deployments>

## Using the contracts
To use the contract we provide truffle artifacts. You can use `truffle-contract` to utilize these.
```javascript
const uportIdentity = require('uport-identity')
const Contract = require('truffle-contract')

let IdentityFactory = Contract(uportIdentity.IdentityFactory)
IdentityFactory.setProvider(web3.currentProvider)
let identityFactory = IdentityFactory.deployed()
```
You can also use web3.
```javascript
let networkId = 1 // Mainnet
let IdentityFactory = web3.eth.contract(uportIdentity.IdentityFactory.abi)
let identityFactory = IdentityFactory.at(uportIdentity.IdentityFactory.networks[networkId].address)
```

## Contracts
This repository contains the contracts currently in use by uPort. This is also where you find the addresses of these contracts currently deployed on Ropsten and Mainnet.

### IdentityFactory
A factory that creates new identities with a Proxy, RecoverableController and RecoveryQuorum.

### IdentityFactoryWithRecoveryKey
A factory that creates new identities with a Proxy and RecoverableController.

### Proxy
This is the main identity contract. All your transactions are forwarded through this contract which acts as your persistent identifier.

### RecoverableController
This is a controller which plugs in to the proxy contract. It gives you the ability to have one key that can make transactions through the proxy, but can't change the owner of the proxy, and another key that acts as a recovery key that can change the owner of the proxy. This gives you the ability to store a recovery key in cold storage while you can use your main key for regular transactions. If your main key is lost you can change it using the recovery key from cold storage.

### RecoveryQuorum
This contract plugs into the RecoverableController to provide recovery with a n-of-m setup. This allows for creating recovery networks consisting of your friends.

### ArrayLib
A library for finding and removing addresses in arrays.

## Contributing
Want to contribute to uport-contracts? Cool, please read our [contribution guidelines](./CONTRIBUTING.md) to get an understanding of the process we use for making changes to this repo.
