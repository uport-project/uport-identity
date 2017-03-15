# uPort
Please read our [Whitepaper](http://whitepaper.uport.me/uPort_whitepaper_DRAFT20161020.pdf) for information on what uPort is, and what is currently possible as far as integration.

## Contracts
This repository contains the contracts currently in use by uPort. This is also where you find the addresses of these contracts currently deployed on Ropsten and Mainnet.

### Proxy
This is the main identity contract. All your transactions are forwarded through this contract which acts as your persistent identifier.

### RecoverableController
This is a controller which plugs in to the proxy contract. It gives you the ability to have one key that can make transactions through the proxy, but can't change the owner of the proxy, and another key that acts as a recovery key that can change the owner of the proxy. This gives you the ability to store a recovery key in cold storage while you can use your main key for regular transactions. If your main key is lost you can change it using the recovery key from cold storage.

### RecoveryQuorum
This contract plugs into the RecoverableController to provide recovery with a n-of-m setup. This allows for creating recovery networks consisting of your friends.

### UportRegistry
This contract is used to store information related to your identity.


## JavaScript integration
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
The library exposes a `UportContracts` object which has all other contract objects nested in it (i.e. `UportContracts.Registry`). These objects are built using truffle-contract [see full API](https://github.com/trufflesuite/truffle-contract). They have promise-based functions corresponding to their solidity functions, and once initialized with a [web3](https://github.com/ethereum/web3.js/) `provider`, will know their deployed address corresponding to the provided network.

```javascript
Web3 = require('web3');

if (typeof web3 == 'undefined') {
  web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io"));
}

UportContracts.Registry.setProvider(web3.currentProvider)
UportContracts.Registry.deployed().then(function(instance){
  uportRegistry = instance
  console.log("Registry Address (ropsten): ", uportRegistry.address)
  var someExistingUportAddress = "0x58471b238277224d2e1d0a3d07a40a9fe5bd485e"
  return uportRegistry.getAttributes.call(someExistingUportAddress)
}).then(function(encodedIpfsAddress) {
  console.log("SelfSigned Attributes: ", encodedIpfsAddress)
});

```

## Contributing
Want to contribute to uport-contracts? Cool, please read our [contribution guidelines](./CONTRIBUTING.md) to get an understanding of the process we use for making changes to this repo.

## Known Issues
Web3 version 0.18.3 itself has a bug that is causing a syntax error when using as a node package with browserify. Until web3 version 0.18.4 is published, this code will not work in the browser unless you use dist.js. I made a pull request [here](https://github.com/ethereum/web3.js/pull/563) and the fix has been merged into develop.
