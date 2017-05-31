pragma solidity 0.4.8;
import "./RecoveryQuorum.sol";

contract RecoveryQuorumFactory {
    event RecoveryQuorumCreated(address recoveryQuorum);

    function CreateRecoveryQuorum(address _controller, address[] delegates) {
        RecoveryQuorum recoveryQuorum = new RecoveryQuorum(_controller, delegates);
        RecoveryQuorumCreated(recoveryQuorum);
    }
}
