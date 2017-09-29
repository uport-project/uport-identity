# Testing on a private geth network
To be more certain of that our contracts works as intended we want to not only test them using ethereumjs-testrpc, but also a real geth test network. The main reason for this is that ethereumjs-testrpc runs a different implementation of the EVM that might not be compatible with the EVM on the mainnet at all times.

## Setting up the node
This repo includes a configuration for a private geth setup. To get going simply run the two following commands in the root folder of the repo.
```bash
$ geth --datadir .geth/ init .geth/genesis.json
```
This command simply initializes the data folder with our special genesis block.

```bash
$ geth --datadir .geth/ --networkid 234 --nodiscover --rpc --rpcport 8544 --port 30304 --minerthreads=1 --unlock 0x0c35cca2de5e9c8e87294c6d4a6178c0a41dbc41,0xce90a10ae09cefd105a849acf208f5614322fb7d,0x97e860850d91ff42c6572ec5a3dae9256f8217a9,0xeff3c186c72631323c3a7ea96268b2862ad6705d,0x6c58a6f501590b59fce3092a8e4a85fd03920741,0xad2a1776fbd0514a76412c23a43a0a9658217fb0,0x8b5dc0abfda72911abb1cb3a25321a1ed1a72682,0x78994b24225a8e9066fab4067245493a83184b69,0xaf0e721ab230f822d8e93f8585f0fc6677feb22f,0x3d9a5c3cc53c3cd02665a118bd93fdf35ef7fbfb --password .geth/pw --mine console
```
This command unlocks all of our testing accounts and starts the mining. Keep this command running in the background while you continue.

## Running the tests

