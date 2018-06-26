# uPort Identity Contracts
[![npm](https://img.shields.io/npm/v/uport-identity.svg)](https://www.npmjs.com/package/uport-identity)
![CircleCI](https://img.shields.io/circleci/project/github/uport-project/uport-identity.svg)
[![Join the chat at](https://img.shields.io/badge/Riot-Join%20chat-green.svg)](https://chat.uport.me/#/login)
[![solidity-coverage](https://img.shields.io/badge/coverage-98.98%25-green.svg)](https://uport-project.github.io/uport-identity/coverage)

## Contract documentation
This repository contains the contracts currently in use by uPort. This is also where you find the addresses of these contracts currently deployed on Mainnet and relevant test networks. Below you can find descriptions of each of the contracts and the rationale behind the design decisions.

 [Proxy](./docs/reference/proxy.md) | [TxRelay](./docs/reference/txRelay.md) |  [IdentityManager](./docs/reference/identityManager.md) | [MetaIdentityManager](./docs/reference/metaIdentityManager.md)

1. [Using the contracts](./docs/guides/index.md#using-the-contracts)
1. [Testing the contracts](./docs/guides/index.md#texting-the-contracts)
1. [Contract interactions](./docs/guides/index.md#main-contract-interactions)
1. [Deploying contracts to a private network](./docs/guids/index.md#deploying-contracts-to-a-private-network)

## Contract Deployments
### Mainnet (id: 1)
|Contract|Address|
| --|--|
|IdentityManager|[0x22a4d688748845e9d5d7394a0f05bc583adf4656](https://etherscan.io/address/0x22a4d688748845e9d5d7394a0f05bc583adf4656)|
|TxRelay|[0xec2642cd5a47fd5cca2a8a280c3b5f88828aa578](https://etherscan.io/address/0xec2642cd5a47fd5cca2a8a280c3b5f88828aa578)|
|MetaIdentityManager|[0x27500ae27b6b6ad7de7d64b1def90f3e6e7ced47](https://etherscan.io/address/0x27500ae27b6b6ad7de7d64b1def90f3e6e7ced47)|

### Rinkeby testnet (id: 4)
|Contract|Address|
| --|--|
|IdentityManager|[0x19aece3ae41ee33c30f331906b7e4bb578946a55](https://rinkeby.etherscan.io/address/0x19aece3ae41ee33c30f331906b7e4bb578946a55)|
|TxRelay|[0xda8c6dce9e9a85e6f9df7b09b2354da44cb48331](https://rinkeby.etherscan.io/address/0xda8c6dce9e9a85e6f9df7b09b2354da44cb48331)|
|MetaIdentityManager|[0x87ea811785c4bd30fc104c2543cf8ed90f7eeec7](https://rinkeby.etherscan.io/address/0x87ea811785c4bd30fc104c2543cf8ed90f7eeec7)|

### Kovan testnet (id: 42)
|Contract|Address|
| --|--|
|IdentityManager|[0xdb55d40684e7dc04655a9789937214b493a2c2c6](https://kovan.etherscan.io/address/0xdb55d40684e7dc04655a9789937214b493a2c2c6)|
|TxRelay|[0xa9235151d3afa7912e9091ab76a36cbabe219a0c](https://kovan.etherscan.io/address/0xa9235151d3afa7912e9091ab76a36cbabe219a0c)|
|MetaIdentityManager|[0x737f53c0cebf0acd1ea591685351b2a8580702a5](https://kovan.etherscan.io/address/0x737f53c0cebf0acd1ea591685351b2a8580702a5)|

### Ropsten testnet (id: 3)
|Contract|Address|
| --|--|
|IdentityManager|[0x27500ae27b6b6ad7de7d64b1def90f3e6e7ced47](https://ropsten.etherscan.io/address/0x27500ae27b6b6ad7de7d64b1def90f3e6e7ced47)|
|TxRelay|[0xa5e04cf2942868f5a66b9f7db790b8ab662039d5](https://ropsten.etherscan.io/address/0xa5e04cf2942868f5a66b9f7db790b8ab662039d5)|
|MetaIdentityManager|[0xbdaf396ce9b9b9c42cd40d37e01b5dbd535cc960](https://ropsten.etherscan.io/address/0xbdaf396ce9b9b9c42cd40d37e01b5dbd535cc960)|


## Contributing
Want to contribute to uport-contracts? Cool, please read our [contribution guidelines](./CONTRIBUTING.md) to get an understanding of the process we use for making changes to this repo.
