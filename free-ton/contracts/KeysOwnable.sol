pragma solidity >= 0.6.0;
pragma AbiHeader expire;


contract KeysOwnable {
    mapping(uint => bool) ownerKeys;

    modifier onlyOwnerKey(uint key) {
        require(ownerKeys.exists(key) && ownerKeys.at(key) == true, 303);
        _;
    }

    function _grantOwnership(uint publicKey) internal {
        ownerKeys[publicKey] = true;
    }
}
