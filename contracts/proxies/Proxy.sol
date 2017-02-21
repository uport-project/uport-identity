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
pragma solidity 0.4.8;
import "../libraries/Owned.sol";
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

// 'VERSION 4' very minimal gas deployment. also not used yet.
// interestingly, compiling this with solidity 0.4.4 makes it ~113 bytes smaller
// contract Proxy {
//  address public owner = msg.sender;
//  modifier onlyOwner(){ if (msg.sender == owner) _; }

//  function transfer(address _owner) onlyOwner { owner = _owner; }

//  function () payable {}

//  function forward(address destination, uint value, bytes data) onlyOwner {
//    if (!destination.call.value(value)(data)) { throw; }
//  }
// }


// 'VERSION 5' similar minimal gas deployment - with and some added variables to save gas on calls
// similarly, compiling this with solidity 0.4.4 makes it ~140 bytes smaller
// contract Proxy {
//  address public owner = msg.sender;
//  address public userKey;
//  modifier onlyOwner(){ if (msg.sender == owner || msg.sender == userKey) _; }

//  function transfer(address _owner, address _newUserKey) onlyOwner { owner = _owner; userKey = _newUserKey;}

//  function () payable {}

//  function forward(address destination, uint value, bytes data) onlyOwner {
//    if (!destination.call.value(value)(data)) { throw; }
//  }
// }

