# uPort Identity Contracts
[![npm](https://img.shields.io/npm/v/npm.svg)](https://www.npmjs.com/package/uport-identity)
![CircleCI](https://img.shields.io/circleci/project/github/uport-project/uport-identity.svg)
[![solidity-coverage](https://img.shields.io/badge/coverage-97.42%25-green.svg)](https://uport-project.github.io/uport-identity/coverage)

Please read our [Whitepaper](http://whitepaper.uport.me) for information on what uPort is, and what is currently possible as far as integration.

## Contract Deployments
### Mainnet (id: 1)
|Contract|Address|
| --|--|
|IdentityManager|(not deployed)|
|TxRelay|(not deployed)|
|MetaIdentityManager|(not deployed)|

### Rinkeby testnet (id: 4)
|Contract|Address|
| --|--|
|IdentityManager|[0xabbcd5b340c80b5f1c0545c04c987b87310296ae](https://rinkeby.etherscan.io/address/0xabbcd5b340c80b5f1c0545c04c987b87310296ae)|
|TxRelay|[0x476debfb878d266d9e3182d7bb304301a8748aad](https://rinkeby.etherscan.io/address/0x476debfb878d266d9e3182d7bb304301a8748aad)|
|MetaIdentityManager|[0x7c338672f483795eca47106dc395660d95041dbe](https://rinkeby.etherscan.io/address/0x7c338672f483795eca47106dc395660d95041dbe)|

### Kovan testnet (id: 42)
|Contract|Address|
| --|--|
|IdentityManager|[0x71845bbfe5ddfdb919e780febfff5eda62a30fdc](https://kovan.etherscan.io/address/0x71845bbfe5ddfdb919e780febfff5eda62a30fdc)|
|TxRelay|[0x899d47b36d94bc36050e9fdddb7d210a62c8656c](https://kovan.etherscan.io/address/0x899d47b36d94bc36050e9fdddb7d210a62c8656c)|
|MetaIdentityManager|[0xd36ea9fa1235763e25cfc6625a55cc2a3a3b7556](https://kovan.etherscan.io/address/0xd36ea9fa1235763e25cfc6625a55cc2a3a3b7556)|

### Ropsten testnet (id: 3)
|Contract|Address|
| --|--|
|IdentityManager|(not deployed)|
|TxRelay|(not deployed)|
|MetaIdentityManager|(not deployed)|


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
This repository contains the contracts currently in use by uPort. This is also where you find the addresses of these contracts currently deployed on Mainnet and relevant test networks. Below you can find descriptions of each of the contracts and the rationale behind the design decisions.

#### [Proxy](./docs/proxy.md)
#### [TxRelay](./docs/txRelay.md)
#### [IdentityManager](./docs/identityManager.md)
#### [MetaIdentityManager](./docs/metaIdentityManager.md)

### Main contract interactions
The most important interactions with the contracts are creation of identities and sending transactions. Here are visual representations of this being executed.

#### Creating an identity with the IdentityManager
![identity creation](./diagrams/create-identity.seq.png)

#### Transfer an identity to IdentityManager
![register identity](./diagrams/register-identity.seq.png)

#### Send a meta-tx
![meta-tx](./diagrams/send-tx.seq.png)

## Contributing
Want to contribute to uport-contracts? Cool, please read our [contribution guidelines](./CONTRIBUTING.md) to get an understanding of the process we use for making changes to this repo.
