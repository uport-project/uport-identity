pragma solidity ^0.4.4;
import "../libraries/Owned.sol";

contract SensuiBank is Owned{
  uint public limit; // wei
  uint public cycleTime;
  uint public cycleEnd;
  uint public spentThisCycle;
  address public uportTeam;

  function() payable{}
  function SensuiBank(address _uportTeam, uint _limit){
    owner = msg.sender;
    uportTeam = _uportTeam;
    limit = _limit; // wei
    cycleTime = 604800; //one week
    cycleEnd = now + cycleTime;
  }

  function withdraw(uint amount) onlyOwner{
    if(withdrawlIsValid(amount)){
      spentThisCycle += amount;
      if(!owner.send(amount)) throw;//possible to 
    }
  }
  //settings
  modifier onlyUportTeam(){ if(msg.sender == uportTeam) _; }
  function setLimit(uint _limit) onlyUportTeam{
    limit = _limit; // wei
  }
  function setTimelock(uint _cycleTime) onlyUportTeam{
    cycleTime = _cycleTime;
  }
  function emergencyWithdraw() onlyUportTeam{
      if(!uportTeam.send(this.balance)){ throw; }
  }
  //private
  function withdrawlIsValid(uint amount) private returns(bool){
    if(now > cycleEnd){
      cycleEnd = now + cycleTime;
      spentThisCycle = 0;
    }
    if((amount <= limit - spentThisCycle) && (limit >= spentThisCycle/* sanity check*/)){
      return true;
    }else{
      return false;
    }
  }
}

