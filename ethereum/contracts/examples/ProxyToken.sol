/*
    This is an example of Ethereum Proxy contract, which allows to implement
    token transfers between Ethereum and TON with Broxus bridge.
    Each ProxyToken corresponds to a single
*/
contract ProxyToken {
    address token;
    address bridge;

    constructor(address _token) public {
        token = _token;
        bridge = _bridge;
    }

    function lockTokens() public {

    }

    function unlockTokens() public {

    }
}
