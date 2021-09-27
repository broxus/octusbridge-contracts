pragma ton-solidity >= 0.39.0;


interface IRound {
    function relayKeys() external responsible view returns(uint[] _keys);
}
