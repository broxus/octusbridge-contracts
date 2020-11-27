pragma solidity >= 0.6.0;
pragma AbiHeader expire;


contract KeysOwnable {
    mapping(uint => bool) ownerKeys;

    function _grantOwnership(uint publicKey) internal {
        ownerKeys[publicKey] = true;
    }
}
