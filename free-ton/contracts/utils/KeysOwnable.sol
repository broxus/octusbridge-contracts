pragma solidity >= 0.6.0;
pragma AbiHeader expire;


contract KeysOwnable {
    mapping(uint => bool) ownerKeys;

    function getKeyStatus(uint key) public view returns(bool _status) {
        return ownerKeys[key];
    }

    modifier onlyOwnerKey(uint key) {
        require(ownerKeys[key] == true, 303);
        _;
    }

    function _grantOwnership(uint key) internal {
        ownerKeys[key] = true;
    }

    function _removeOwnership(uint key) internal {
        ownerKeys[key] = false;
    }
}
