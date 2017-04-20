pragma solidity ^0.4.4;
import "./Proxy.sol";
contract MetaTxController {

  Proxy public proxy;
  address public userKey;
  address public adminKey;
  uint public referenceNonce;

  modifier only(address key) { if (msg.sender == key) _;}

  function MetaTxController(address proxyAddress, address _userKey, address _adminKey) {
    proxy = Proxy(proxyAddress);
    userKey = _userKey;
    adminKey = _adminKey;
    referenceNonce = 0;
  }

  function sendTx(address destination, uint value, bytes data, uint nonce, uint8 v, bytes32 r, bytes32 s) {

    var h = sha3(destination, bytes32(value), bytes32(nonce), data);
    var addressFromSig = ecrecover(h,v,r,s);
    
    if (nonce == referenceNonce && addressFromSig == userKey) {
      proxy.forward(destination, value, data);
      referenceNonce += 1;
    }
  }

  function updateUserKey(address newUserKey) only(adminKey) {
    userKey = newUserKey;
  }

  function updateAdminKey(address newAdminKey) only(adminKey) {
    adminKey = newAdminKey;
  }

  function transferOwnership(address newOwner) only(adminKey) {
    // This will end the functionality of the Ownership contract
    // since it's no longer allowed to forward transactions
    // to the proxy
    proxy.transfer(newOwner);
    suicide(newOwner);
  }

}

