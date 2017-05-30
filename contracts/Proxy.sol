// VERSION 1
// pragma solidity 0.4.9;
// import "../libraries/Owned.sol";
// contract Proxy is Owned {
//   event Forwarded (address indexed destination, uint value, bytes data );

//   function () payable {}

//   function forward(address destination, uint value, bytes data) onlyOwner {
//     if (!destination.call.value(value)(data)) { throw; }
//     Forwarded(destination, value, data);
//   }
// }

// VERSION 2
pragma solidity ^0.4.8;
import "./libs/Owned.sol";
contract Proxy is Owned {
  event Forwarded (address indexed destination, uint value, bytes data );
  event Received (address indexed sender, uint value);

  function () payable { Received(msg.sender, msg.value); }

  function forward(address destination, uint value, bytes data) onlyOwner {
    if (!destination.call.value(value)(data)) { throw; }
    Forwarded(destination, value, data);
  }
}

// 'VERSION 3' creatable proxy will go here. not used yet though...
// contract Proxy is Owned {
//   event Forwarded (address indexed destination, uint value, bytes data );
//   event Received (address indexed sender, uint value);

//   function () payable { Received(msg.sender, msg.value); }

//   function forward(address destination, uint value, bytes data) onlyOwner {
//     if (destination == 0){
//       assembly {
//         destination := create(0,add(data,0x20), mload(data))
//       }
//     }
//     else if (!destination.call.value(value)(data)) { throw; }
//   }
// }
