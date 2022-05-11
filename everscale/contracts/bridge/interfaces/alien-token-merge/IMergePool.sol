pragma ton-solidity >= 0.39.0;


interface IMergePool {
    function receiveTokenDecimals(
        uint8 decimals
    ) external;

    function removeToken(
        address token
    ) external;

    function addToken(
        address token
    ) external;

    function setCanon(
        address token
    ) external;

    function getCanon() external responsible returns (address, uint8);

    function getTokens() external responsible returns(
        mapping(address => uint8) _tokens,
        address _canon
    );
}
