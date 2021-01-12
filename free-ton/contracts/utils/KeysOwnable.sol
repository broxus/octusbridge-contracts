pragma solidity >= 0.6.0;
pragma AbiHeader expire;


contract KeysOwnable {
    mapping(uint => bool) ownerKeys;
    mapping(uint => uint160) ownerEthereumAccounts;

    event OwnershipGranted(uint key);
    event OwnershipRemoved(uint key);

    function getKeyStatus(uint key) public view returns(bool _status) {
        return ownerKeys[key];
    }

    /*
        Get Ethereum account according according to the owner public key
        @param key TON public key
        @return ethereumAccount Corresponding Ethereum account
    */
    function getEthereumAccount(
        uint key
    ) public view returns(uint160 ethereumAccount) {
        return ownerEthereumAccounts[key];
    }

    modifier onlyOwnerKey(uint key) {
        require(ownerKeys[key] == true, 303);
        _;
    }

    function _grantOwnership(uint key, uint160 ethereumAccount) internal {
        ownerKeys[key] = true;
        ownerEthereumAccounts[key] = ethereumAccount;

        emit OwnershipGranted(key);
    }

    function _removeOwnership(uint key) internal {
        delete ownerKeys[key];
        delete ownerEthereumAccounts[key];

        emit OwnershipRemoved(key);
    }

    function getKeys() public view returns(uint[] keys, uint160[] ethereumAccounts) {
        for ((uint key, bool status): ownerKeys) {
            if (status) {
                keys.push(key);
                ethereumAccounts.push(ownerEthereumAccounts[key]);
            }
        }
    }
}
