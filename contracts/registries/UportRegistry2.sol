pragma solidity 0.4.8;

contract UportRegistry2{
  uint public version;
  address public previousPublishedVersion;
  mapping(bytes32 => mapping(address => mapping(address => bytes32))) public registry;

  function UportRegistry2(address _previousPublishedVersion) {
    version = 2;
    previousPublishedVersion = _previousPublishedVersion;
  }

  event Set(
    bytes32 indexed registrationIdentifier,
    address indexed issuer,
    address indexed subject);

  //create or update
  function set(bytes32 registrationIdentifier, address subject, bytes32 value){
      Set(registrationIdentifier, msg.sender, subject);
      registry[registrationIdentifier][msg.sender][subject] = value;
  }

  function get(bytes32 registrationIdentifier, address issuer, address subject) constant returns(bytes32){
      return registry[registrationIdentifier][issuer][subject];
  }
}
