##WIP
In the past, the uport team has created many different repositories containing different subsets of contracts and libraries. This repository is meant to become the primary source of information about what contracts we are currently using, and the addresses of those contracts on ethereum mainnet as well as ropsten testnet

In the 'build/contracts' folder you will find .json files. These files specify the ABI definitions of the contracts, and the networks they are deployed on, along with their addresses on those networks (applicable only to singleton contracts ie, the registries and factories). The files are in a standard format that can be used by truffle-artifactor to easily create corresponding promise-based javascript objects. //link to see truffle-artifactor

This is still a work in progress please see uport-registry for information on the current registry
