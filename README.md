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
"uport-contracts": "git://github.com/uport-project/uport-contracts.git#develop"
```
or simply download and include `dist.js` in an html file
```
<html>
  <head>
    <script type="text/javascript" src="dist.js"></script>
  </head>
  <body>
    This page has global access to the `UportContracts` and `Web3` javascript objects.
  </body>
</html>

```
The library exposes a `Uport` object which has all other contract objects nested in it (i.e. `Uport.Registry`). These objects are built using truffle-contract (see full API)[https://github.com/trufflesuite/truffle-contract]. They have promise-based functions corresponding to their solidity functions, and once initialized with a (web3)[https://github.com/ethereum/web3.js/] `provider`, will know their deployed address corresponding to the provided network.

```
Web3 = require('web3');

if (typeof web3 == 'undefined') {
  web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io"));
}

Uport.Registry.setProvider(web3.currentProvider)
Uport.Registry.deployed().then(function(instance){
  uportRegistry = instance
  console.log("Registry Address (ropsten): ", uportRegistry.address)
  return uportRegistry.get.call("uPortProfileIPFS1220", "0x1F4E7Db8514Ec4E99467a8d2ee3a63094a904e7A", "0x1F4E7Db8514Ec4E99467a8d2ee3a63094a904e7A")
}).then(function(encodedIpfsAddress) {
  console.log("SelfSigned Attributes: ", encodedIpfsAddress)
});

```
(todo: add more examples)

##Known Issues
This is still a work in progress and as of now, the uport-registry used by the uport team is the older version with less functionality found [here](https://github.com/uport-project/uport-registry). 

Web3 version 0.18.3 itself has a bug that is causing a syntax error when using as a node package with browserify. Until web3 version 0.18.4 is published, this code will not work in the browser unless you use dist.js. I made a pull request [here](https://github.com/ethereum/web3.js/pull/563) and the fix has been merged into develop.
