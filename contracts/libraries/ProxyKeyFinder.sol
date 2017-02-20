// mainnet: 0xe60de4444354c414c8f365e79059bcabbcf98092
// ropsten: 0x218713e35cdfeb4dd74bfbe8e48f1ac1c23ba7d9
pragma solidity 0.4.8;
import "../controllers/StandardController.sol";

contract ProxyKeyFinder{
    function getProxyKey(address _proxy) returns(address){
        Proxy proxy = Proxy(_proxy);
        StandardController controller = StandardController(proxy.owner());
        return controller.userKey();
    }
}
