##WIP
Over the last year or so, the uport team has created many different repositories containing different subsets of contracts and libraries. This repository is meant to become the primary source of information about what contracts we are currently using, and well as a history, of addresses and contracts we've used over during our development.

Some of the contracts are named with numbers corresponding to their versions. The highest number is the most recent version, the current version. 

In the 'build/contracts' folder you will find .json files. These files specify the ABI definitions of the contracts, as well as the networks they are deployed on, along with their addresses on those networks (applicable only to singleton contracts ie, the registries and factories). The files are in a standard format that can be used by truffle-artifactor to easily create corresponding promise-based javascript objects. //link to see truffle-artifactor
