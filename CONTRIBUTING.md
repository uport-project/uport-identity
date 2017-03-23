# Contributing to uport-contracts
We `<3` contributors!

This document describes guidelines for contributing to uport-contracts as well as the process of assuring the security of all contracts. They are meant to make life easier for us, but also to help you understand how stuff gets into the master branch.

## Testing
All aspects of the contracts need to be tested. To do this we use `truffle` and `testrpc`. Right now we only have tests written in javascript, but in the future we plan on adding tests written in solidity as well.

To execute the tests you simply run:
```
$ npm test
```

If you want to run run a specific test you can just add the filename:
```
$ npm test test/testName.js
```

Also, make sure to run the linter
```
$ npm run lint
```

## Making a pull request
Once you have made changes that you want to get into uport-contracts you need to create a pull request. We follow git flow, so make sure to name your branch in the format of `feature/description-of-your-feature` or `hotfix/description-of-your-fix`. Also make sure that your pull request is against the `develop` branch and **not** `master`.

## Reviewing process
The contracts in this repo are an essential part of the uport ecosystem. Therefore it is very important that they are properly reviewed to minimize the risk of potential bugs and exploits.

### Merging into develop
A pull request being merged into `develop` needs to be reviewed by at least two members of the uport team.

### Merging into master
A pull request being merged into `master` needs to be reviewed by a security team that is external to the uport team. These pull request ideally only originate from the `develop` branch which has been reviewed by the uport team. All contracts that are being merged also needs to be deployed on the *relevant networks* with the addresses specified in the `build/contracts` folder.

#### Relevant networks
Right now the networks we want the contracts deployed on are `ropsten (testnet)` and ethereums `mainnet`.

## Checklist for external review
Here is a checklist of things to be checked by an external review. Note that this is not an extensive list.

* Review solidity code
* Verify compiled bytecode against deployed bytecode
