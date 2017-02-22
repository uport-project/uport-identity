##uPort
Please read our (Whitepaper)[http://whitepaper.uport.me/uPort_whitepaper_DRAFT20161020.pdf] for information on what uPort is, and what is currently possible as far as integration.

##Contracts
This Repository is uPort's *most* up-to-date source on our currently used contracts, and addresses of our deployed contracts on Ropsten and Ethereum (mainnet).
- [Solidity Contracts](https://github.com/ConsenSys/uport-proxy/tree/master/contracts)
- [ABI Definitions and Deployed Addresses](https://github.com/ConsenSys/uport-proxy/tree/master/build/contracts) (created with truffle-artifactor. Note: not all contracts have deployments)
- JS integrations/tests (not available yet)



##JavaScript Integration
Either install the package with npm in your `package.json` file:
```
"public": "git://github.com/uport-project/uport-contracts.git#master"
```
or simply download and include `dist.js` in an html file
```
<script type="text/javascript" src="dist.js"></script>

```
The library exposes a `Uport` object which has all other contract objects nested in it (i.e. `Uport.Registry`). These objects are built using truffle-contract (see full API)[https://github.com/trufflesuite/truffle-contract]. They have promise-based functions corresponding to their solidity functions, and once initialized with a (web3)[https://github.com/ethereum/web3.js/] `provider`, will know their deployed address corresponding to the provided network.

```
if (typeof web3 == 'undefined') {
  web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io"));
}

Uport.Registry.setProvider(web3.currentProvider)
uportRegistry = null
Uport.Registry.deployed().then(function(instance) {
  uportRegistry = instance
  console.log("uportRegistry address: ", uportRegistry.address)
  return uportRegistry.getAttributes.call("0x58471b238277224d2e1d0a3d07a40a9fe5bd485e")
}).then(function(ipfsAddressInBytes) {
  console.log("bytes: ", ipfsAddressInBytes)
});

```
(todo: add more examples)

##Known Issues
This is still a work in progress and as of now, the uport-registry used by the uport team is the older version with less functionality found [here](https://github.com/uport-project/uport-registry). 

Web3 version 0.18 itself has a bug that is causing a syntax error when used in the browser. Until fixed, this code will not work in the browser. I made a pull request [here](https://github.com/ethereum/web3.js/pull/563) and the bug is filed [here](https://github.com/ethereum/web3.js/issues/555)
