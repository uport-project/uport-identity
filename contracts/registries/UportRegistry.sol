// VERSION 1
// mainnet: 0x022f41a91cb30d6a20ffcfde3f84be6c1fa70d60
// ropsten: 0xb9C1598e24650437a3055F7f66AC1820c419a679
pragma solidity 0.4.8;
contract UportRegistry{
  event AttributesSet(address indexed _sender, uint _timestamp);

  uint public version;
  address public previousPublishedVersion;

  mapping(address => bytes) public ipfsAttributeLookup;

  function UportRegistry(address _previousPublishedVersion) {
    version = 1;
    previousPublishedVersion = _previousPublishedVersion;
  }

  function setAttributes(bytes ipfsHash) {
    ipfsAttributeLookup[msg.sender] = ipfsHash;
    AttributesSet(msg.sender, now);
  }

  function getAttributes(address personaAddress) constant returns(bytes) {
    return ipfsAttributeLookup[personaAddress];
  }
}
