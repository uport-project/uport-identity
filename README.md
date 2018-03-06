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
|IdentityManager|[0x5e26d1d62b77d59ee54d97eb5b4bf7aef679067b](https://etherscan.io/address/0x5e26d1d62b77d59ee54d97eb5b4bf7aef679067b)|
|TxRelay|[0xdb0efde21a5f59c4829e343419a8996fff5c7924](https://etherscan.io/address/0xdb0efde21a5f59c4829e343419a8996fff5c7924)|
|MetaIdentityManager|[0x7ed7ceb55167eb71e775a352111dae44db754c40](https://etherscan.io/address/0x7ed7ceb55167eb71e775a352111dae44db754c40)|

### Rinkeby testnet (id: 4)
|Contract|Address|
| --|--|
|IdentityManager|[0xfc3d29e4d35ce217a84b8684cb3570977094e66b](https://rinkeby.etherscan.io/address/0xfc3d29e4d35ce217a84b8684cb3570977094e66b)|
|TxRelay|[0xb63b79444c1656c21ad1a21a04f1496e3707480c](https://rinkeby.etherscan.io/address/0xb63b79444c1656c21ad1a21a04f1496e3707480c)|
|MetaIdentityManager|[0x119c2ca7e85e1c5cf86ebbaa4c23ae01a4d1bc00](https://rinkeby.etherscan.io/address/0x119c2ca7e85e1c5cf86ebbaa4c23ae01a4d1bc00)|

### Kovan testnet (id: 42)
|Contract|Address|
| --|--|
|IdentityManager|[0xc67c19b13bb42d23704a7b253aadf3230a78e6d3](https://kovan.etherscan.io/address/0xc67c19b13bb42d23704a7b253aadf3230a78e6d3)|
|TxRelay|[0x19aece3ae41ee33c30f331906b7e4bb578946a55](https://kovan.etherscan.io/address/0x19aece3ae41ee33c30f331906b7e4bb578946a55)|
|MetaIdentityManager|[0xda8c6dce9e9a85e6f9df7b09b2354da44cb48331](https://kovan.etherscan.io/address/0xda8c6dce9e9a85e6f9df7b09b2354da44cb48331)|

### Ropsten testnet (id: 3)
|Contract|Address|
| --|--|
|IdentityManager|[0x0ec689c2864e1f11670b8294a83fffdf6e446a7f](https://ropsten.etherscan.io/address/0x0ec689c2864e1f11670b8294a83fffdf6e446a7f)|
|TxRelay|[0x790a57a505fe46396777dde06f47e0cfb5028bf4](https://ropsten.etherscan.io/address/0x790a57a505fe46396777dde06f47e0cfb5028bf4)|
|MetaIdentityManager|[0x15a6e7aeddcc48e1437a61c9d43d946ba112c0c4](https://ropsten.etherscan.io/address/0x15a6e7aeddcc48e1437a61c9d43d946ba112c0c4)|


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

## Deploying contracts to a private network
Add a new entry in `./truffle.js` like so:
```js
yourNetwork: {
  get provider() {
    return getProvider("http://my-private.network/")
  },
  network_id: "*"
},
```
If the gas price on the network is very high you might need to add the `gasPrice` parameter.

Create a file called `./seed`. This file should contain a mnemonic seed phrase. Make sure that the first address of this seed has ether on your private network. Then run:
```
$ yarn _deploy yourNetwork
```

The addresses of the deployed contracts should then be located in `./build/contracts/{ContractName}.json`.


## Contributing
Want to contribute to uport-contracts? Cool, please read our [contribution guidelines](./CONTRIBUTING.md) to get an understanding of the process we use for making changes to this repo.
