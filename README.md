# uPort Identity Contracts
[![npm](https://img.shields.io/npm/v/uport-identity.svg)](https://www.npmjs.com/package/uport-identity)
![CircleCI](https://img.shields.io/circleci/project/github/uport-project/uport-identity.svg)
[![solidity-coverage](https://img.shields.io/badge/coverage-98.98%25-green.svg)](https://uport-project.github.io/uport-identity/coverage)
[![Join the chat at](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/uport-project/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Please read our [Whitepaper](http://whitepaper.uport.me) for information on what uPort is, and what is currently possible as far as integration.

## Contract Deployments
### Mainnet (id: 1)
|Contract|Address|
| --|--|
|IdentityManager|[0xb7d66b18fbe8eb655ce7daa5d616d908c25c32a7](https://etherscan.io/address/0xb7d66b18fbe8eb655ce7daa5d616d908c25c32a7)|
|TxRelay|[0xa2a24504c7bbb24ce92b5fa8a9befc3cbded560d](https://etherscan.io/address/0xa2a24504c7bbb24ce92b5fa8a9befc3cbded560d)|
|MetaIdentityManager|[0x71845bbfe5ddfdb919e780febfff5eda62a30fdc](https://etherscan.io/address/0x71845bbfe5ddfdb919e780febfff5eda62a30fdc)|

### Rinkeby testnet (id: 4)
|Contract|Address|
| --|--|
|IdentityManager|[0x5e26d1d62b77d59ee54d97eb5b4bf7aef679067b](https://rinkeby.etherscan.io/address/0x5e26d1d62b77d59ee54d97eb5b4bf7aef679067b)|
|TxRelay|[0xdb0efde21a5f59c4829e343419a8996fff5c7924](https://rinkeby.etherscan.io/address/0xdb0efde21a5f59c4829e343419a8996fff5c7924)|
|MetaIdentityManager|[0x7ed7ceb55167eb71e775a352111dae44db754c40](https://rinkeby.etherscan.io/address/0x7ed7ceb55167eb71e775a352111dae44db754c40)|

### Kovan testnet (id: 42)
|Contract|Address|
| --|--|
|IdentityManager|[0x22a4d688748845e9d5d7394a0f05bc583adf4656](https://kovan.etherscan.io/address/0x22a4d688748845e9d5d7394a0f05bc583adf4656)|
|TxRelay|[0xec2642cd5a47fd5cca2a8a280c3b5f88828aa578](https://kovan.etherscan.io/address/0xec2642cd5a47fd5cca2a8a280c3b5f88828aa578)|
|MetaIdentityManager|[0x27500ae27b6b6ad7de7d64b1def90f3e6e7ced47](https://kovan.etherscan.io/address/0x27500ae27b6b6ad7de7d64b1def90f3e6e7ced47)|

### Ropsten testnet (id: 3)
|Contract|Address|
| --|--|
|IdentityManager|[0x468468f383effe864515719e68b0604e04e93f10](https://ropsten.etherscan.io/address/0x468468f383effe864515719e68b0604e04e93f10)|
|TxRelay|[0xabbcd5b340c80b5f1c0545c04c987b87310296ae](https://ropsten.etherscan.io/address/0xabbcd5b340c80b5f1c0545c04c987b87310296ae)|
|MetaIdentityManager|[0x7c338672f483795eca47106dc395660d95041dbe](https://ropsten.etherscan.io/address/0x7c338672f483795eca47106dc395660d95041dbe)|


## Using the contracts
To use the contract we provide truffle artifacts. Once you require the `uport-identity` module you will get an object containing a versioned index of the uport contracts. You can specify which version you want to user, or just use the latest one. Keep in mind that different versions will be deployed to different addresses.
```javascript
const uportIdentity = require('uport-identity')
const Contract = require('truffle-contract')

// use specific version
const IdentityManagerArtifact = uportIdentity.IdentityManager.v1

// or use latest version
const version = uportIdentity.IdentityManager.latestVersion
const IdentityManagerArtifact = uportIdentity.IdentityManager[version]
```

 You can use `truffle-contract` to utilize these artifacts.
```javascript
let IdentityManager = Contract(IdentityManagerArtifact)
IdentityManager.setProvider(web3.currentProvider)
let identityManager = IdentityManager.deployed()
```
You can also use web3.
```javascript
let networkId = 1 // Mainnet
let IdentityManager = web3.eth.contract(IdentityManagerArtifact)
let identityManager = IdentityManager.at(IdentityManagerArtifact.networks[networkId].address)
```

If you want to learn more about this structure, checkout the document about the [artifact index](./docs/artifact-index.md).

## Testing the contracts
All aspects of the contracts need to be tested. To do this we use `truffle` and `testrpc` behind the scenes. Right now we only have tests written in javascript, but in the future we plan on adding tests written in solidity as well.

To execute the tests you simply run:
```
$ yarn test
```

If you want to run run a specific test you can just add the filename:
```
$ yarn test test/testName.js
```

You can also run the tests on a [geth node](./docs/private-geth-testing.md).

## Contract documentation
This repository contains the contracts currently in use by uPort. This is also where you find the addresses of these contracts currently deployed on Mainnet and relevant test networks. Below you can find descriptions of each of the contracts and the rationale behind the design decisions.

#### [Proxy](./docs/proxy.md)
#### [TxRelay](./docs/txRelay.md)
#### [IdentityManager](./docs/identityManager.md)
#### [MetaIdentityManager](./docs/metaIdentityManager.md)

### Main contract interactions
The most important interactions with the contracts are creation of identities and sending transactions. Here are visual representations of this being executed.

#### Creating an identity with the IdentityManager
![identity creation](./docs/diagrams/create-identity.seq.png)

#### Transfer an identity to IdentityManager
![register identity](./docs/diagrams/register-identity.seq.png)

#### Send a meta-tx
![meta-tx](./docs/diagrams/send-tx.seq.png)

## Contributing
Want to contribute to uport-contracts? Cool, please read our [contribution guidelines](./CONTRIBUTING.md) to get an understanding of the process we use for making changes to this repo.
