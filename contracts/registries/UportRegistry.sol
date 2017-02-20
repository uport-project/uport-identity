// VERSION 1
// mainnet: 0x022f41a91cb30d6a20ffcfde3f84be6c1fa70d60
// ropsten: 0xb9C1598e24650437a3055F7f66AC1820c419a679
// pragma solidity 0.4.6;
// contract UportRegistry{
//   event AttributesSet(address indexed _sender, uint _timestamp);

//   uint public version;
//   address public previousPublishedVersion;

//   mapping(address => bytes) public ipfsAttributeLookup;

//   function UportRegistry(address _previousPublishedVersion) {
//     version = 1;
//     previousPublishedVersion = _previousPublishedVersion;
//   }

//   function setAttributes(bytes ipfsHash) {
//     ipfsAttributeLookup[msg.sender] = ipfsHash;
//     AttributesSet(msg.sender, now);
//   }

//   function getAttributes(address personaAddress) constant returns(bytes) {
//     return ipfsAttributeLookup[personaAddress];
//   }
// }


// VERSION 2
// mainnet: 0x9cbbd4956ad07b88f7daad1ac0bb83f6a58af308
// ropsten: 0x42b5b3ef3f021d3ef91070abf176978cb0fee676
// pragma solidity 0.4.8;

// contract UportRegistry{
//   uint public version;
//   address public previousPublishedVersion;
//   mapping(bytes32 => mapping(address => mapping(address => bytes32))) public registry;

//   function UportRegistry(address _previousPublishedVersion) {
//     version = 2;
//     previousPublishedVersion = _previousPublishedVersion;
//   }

//   event Set(
//     bytes32 indexed registrationIdentifier,
//     address indexed issuer,
//     address indexed subject);

//   //create or update
//   function set(bytes32 registrationIdentifier, address subject, bytes32 value){
//       Set(registrationIdentifier, msg.sender, subject);
//       registry[registrationIdentifier][msg.sender][subject] = value;
//   }

//   function get(bytes32 registrationIdentifier, address issuer, address subject) constant returns(bytes32){
//       return registry[registrationIdentifier][issuer][subject];
//   }
// }

// VERSION 3
// mainnet: 0xab5c8051b9a1df1aab0149f8b0630848b7ecabf6
// ropsten: 0x41566e3a081f5032bdcad470adb797635ddfe1f0
pragma solidity 0.4.8;

contract UportRegistry{
  uint public version;
  address public previousPublishedVersion;
  mapping(bytes32 => mapping(address => mapping(address => bytes32))) public registry;

  function UportRegistry(address _previousPublishedVersion) {
    version = 3;
    previousPublishedVersion = _previousPublishedVersion;
  }

  event Set(
    bytes32 indexed registrationIdentifier,
    address indexed issuer,
    address indexed subject,
    uint updatedAt);

  //create or update
  function set(bytes32 registrationIdentifier, address subject, bytes32 value){
      Set(registrationIdentifier, msg.sender, subject, now);
      registry[registrationIdentifier][msg.sender][subject] = value;
  }

  function get(bytes32 registrationIdentifier, address issuer, address subject) constant returns(bytes32){
      return registry[registrationIdentifier][issuer][subject];
  }
}
