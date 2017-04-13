# uPort Identity Contracts
Please read our [Whitepaper](http://whitepaper.uport.me) for information on what uPort is, and what is currently possible as far as integration.

## Contract Deployments
### Mainnet
| Contract                       | Address                                      |
| -------------------------------|----------------------------------------------|
| ArrayLib                       | `0x5bfa4582b0c48cb375b9e8322b57ac025965c148` |
| IdentityFactory                | `0x12e627125abcfa989de831572f198577780d7127` |
| IdentityFactoryWithRecoveryKey | (not deployed)                               |

### Ropsten testnet (id:3)
| Contract                       | Address                                      |
| -------------------------------|----------------------------------------------|
| ArrayLib                       | `0x957eb298a72167367fa210fc1aa3faba1d2b629c` |
| IdentityFactory                | `0x1c9d9e1962985c9b8101777cae25c46279fe2a9c` |
| IdentityFactoryWithRecoveryKey | (not deployed?)                               |

### Kovan testnet (id:42)
| Contract                       | Address                                      |
| -------------------------------|----------------------------------------------|
| ArrayLib                       | (not deployed?)  
| IdentityFactory                | (not deployed?)  
| IdentityFactoryWithRecoveryKey | (not deployed?)                               |

## Contracts
This repository contains the contracts currently in use by uPort. This is also where you find the addresses of these contracts currently deployed on Ropsten and Mainnet.

### IdentityFactory
(need description)

### IdentityFactoryWithRecoveryKey
(need description)

### Proxy
This is the main identity contract. All your transactions are forwarded through this contract which acts as your persistent identifier.

### RecoverableController
This is a controller which plugs in to the proxy contract. It gives you the ability to have one key that can make transactions through the proxy, but can't change the owner of the proxy, and another key that acts as a recovery key that can change the owner of the proxy. This gives you the ability to store a recovery key in cold storage while you can use your main key for regular transactions. If your main key is lost you can change it using the recovery key from cold storage.

### RecoveryQuorum
This contract plugs into the RecoverableController to provide recovery with a n-of-m setup. This allows for creating recovery networks consisting of your friends.

## Contributing
Want to contribute to uport-contracts? Cool, please read our [contribution guidelines](./CONTRIBUTING.md) to get an understanding of the process we use for making changes to this repo.
