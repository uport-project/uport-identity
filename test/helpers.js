module.exports = function(){
  this.HookedWeb3Provider = require('hooked-web3-provider');
  this.lightwallet = require('eth-signer');
  this.wait = function(seconds){
    return new Promise(function(resolve, reject){
      setTimeout(resolve, seconds*1000);
    })
  }
}
