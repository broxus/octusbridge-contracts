pragma ton-solidity >= 0.39.0;


interface IMergePool {
    struct Token {
        uint8 decimals;
        bool enabled;
    }

    enum BurnType { Withdraw, Swap }

    function receiveTokenDecimals(
        uint8 decimals
    ) external;

    function setManager(
        address _manager
    ) external;

    function removeToken(
        address token
    ) external;

    function addToken(
        address token
    ) external;

    function enableToken(
        address token
    ) external;

    function disableToken(
        address token
    ) external;

    function enableAll() external;

    function disableAll() external;

    function setCanon(
        address token
    ) external;

    function acceptUpgrade(
        TvmCell code,
        uint8 version
    ) external;

    function getCanon() external responsible returns (address, Token);

    function getTokens() external responsible returns(
        mapping(address => Token) _tokens,
        address _canon
    );
}
