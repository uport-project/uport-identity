pragma solidity ^0.4.8;

//This contract is meant as a "singleton" forwarding contract.
//Eventually, it will be able to forward any transaction to
//Any contract that is built to accept it.

contract TxRelay {

  // Note: This is a local nonce.
  // Different from the nonce defined w/in protocol.
  mapping(address => uint) nonce;

  /*
   * @dev Relays normal transactions
   * @param destination The address to relay data to
   * @param data The bytes necessary to call the function in the destination contract.
                 Note, the first encoded argument in data must be msg.sender's address
   */
  function relayTx(address destination, bytes data) payable {
    if (!checkAddress(data, msg.sender)) throw;

    //As no state is updated before, can just throw in the case of a failed call.
    if (!destination.call.value(msg.value)(data)) throw;
  }

  /*
   * @dev Relays meta transactions
   * @param sigV, sigR, sigS ECDSA signature on some data to be forwarded
   * @param data The bytes necessary to call the function in the destination contract.
                 Note, the first encoded argument in data must be address of the signer
   * @param claimedSender Address of the user who is having tx forwarded
   */
  function relayMetaTx(uint8 sigV, bytes32 sigR, bytes32 sigS,
                       address destination, bytes data,
                       address claimedSender) {

    // relay :: nonce :: destination :: data :: relayer
    bytes32 h = sha3(this, nonce[claimedSender], destination, data, msg.sender);
    address addressFromSig = ecrecover(h, sigV, sigR, sigS);

    nonce[claimedSender]++;

    //Validity Checks (if these throw this time, they will always throw)
    if (claimedSender != addressFromSig) throw;
    if (!checkAddress(data, addressFromSig)) throw;

    //Do not throw, as the nonce should still update to protect against replay attacks
    //In the future, this should output an event? This would have some overhead.
    if (!destination.call(data)) {}
  }


  /*
   * @dev Compares the first arg of a function call to an address
   * @param b The byte array that may have an address on the end
   * @param address Address to check on the end of the array
    (Special thanks to tjade273 for optimization)
   */
  function checkAddress(bytes b, address a) constant returns (bool t) {
    if (b.length < 36) return false;
    assembly {
        let mask := 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
        t := eq(and(mask, a), and(mask, mload(add(b,36))))
    }
  }

  /*
 * @dev Returns the local nonce of an account.
 * @param add The address to return the nonce for.
 * @return The specific-to-this-contract nonce of the address provided
 */
  function getNonce(address add) constant returns (uint) {
    return nonce[add];
  }
}
