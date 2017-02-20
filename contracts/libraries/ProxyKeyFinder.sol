pragma solidity 0.4.8;
import "../controllers/StandardController.sol";

contract ProxyKeyFinder{
    function getProxyKey(address _proxy) returns(address){
        Proxy proxy = Proxy(_proxy);
        StandardController controller = StandardController(proxy.owner());
        return controller.userKey();
    }
}
