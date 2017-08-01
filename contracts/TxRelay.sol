pragma solidity 0.4.11;


//This contract is meant as a "singleton" forwarding contract.
//Eventually, it will be able to forward any transaction to
//Any contract that is built to accept it.
contract TxRelay {

  // Note: This is a local nonce.
  // Different from the nonce defined w/in protocol.
  mapping(address => uint) nonce;

  /*
   * @dev Relays meta transactions
   * @param sigV, sigR, sigS ECDSA signature on some data to be forwarded
   * @param destination Location the meta-tx should be forwarded to
   * @param data The bytes necessary to call the function in the destination contract.
                 Note, the first encoded argument in data must be address of the signer
   */
  function relayMetaTx(uint8 sigV, bytes32 sigR, bytes32 sigS,
                       address destination, bytes data) {

    address claimedSender = getAddress(data);
    // relay :: nonce :: destination :: data :: relayer
    bytes32 h = sha3(this, nonce[claimedSender], destination, data, msg.sender);
    address addressFromSig = ecrecover(h, sigV, sigR, sigS);

    if (claimedSender != addressFromSig) throw;

    nonce[claimedSender]++; //if we are going to do tx, update nonce

    if (!destination.call(data)) {
      //In the future, add event here. Has semi-complex gas considerations. See EIP 150
    }
  }

  /*
   * @dev Gets an address encoded as the first argument in transaction data
   * @param b The byte array that should have an address as first argument
   * @returns a The address retrieved from the array
     (Optimization based on work by tjade273)
   */
  function getAddress(bytes b) constant returns (address a) {
    if (b.length < 36) return address(0);
    assembly {
        let mask := 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
        a := and(mask, mload(add(b, 36)))
        //36 is the offset of the first param of the data, if encoded properly.
        //4 bytes for the function signature, and 32 for the addess.
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
