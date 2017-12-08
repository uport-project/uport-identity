# Testing on a private geth network
To be more certain of that our contracts works as intended we want to not only test them using ethereumjs-testrpc, but also a real geth test network. The main reason for this is that ethereumjs-testrpc runs a different implementation of the EVM that might not be compatible with the EVM on the mainnet at all times.

## Setting up the node
This repo includes a configuration for a private geth setup. To get going make sure that you have geth installed and then simply run the following command:
```bash
$ yarn run start-geth
```
Keep this command running in the background while you continue.

## Running the tests

The testrpc has a special feature which checks if the contract throws and if so throws in the calling js code. This is not the case when running tests on geth. Therefore we have disabled all checks for throws when tests are run on geth. In most cases this is ok since we also check if any side effects has taken place, but it's still worth keeping in mind that the tests are not as extensive.

Run the following command to start the tests:
```bash
$ yarn test-geth
```
Please note that running these tests take multiple hours.
