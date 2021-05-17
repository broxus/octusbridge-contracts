pragma ton-solidity ^0.43.0;
pragma AbiHeader expire;


import "./ErrorCodes.sol";


contract AccountsOwnable is ErrorCodes {
    mapping(address => bool) ownerAccounts;
    mapping(address => uint160) ownerEthereumAccounts;

    event OwnershipGranted(address addr);
    event OwnershipRemoved(address addr);

    /*
        Check if account is owner
        @param addr TON account
        @returns _status Boolean, owner or not
    */
    function getAccountStatus(address addr) public view returns(bool _status) {
        return ownerAccounts[addr];
    }

    /*
        Get Ethereum account according according to the owner public key
        @param addr TON account
        @return ethereumAccount Corresponding Ethereum account
    */
    function getEthereumAccount(
        address addr
    ) public view returns(uint160 ethereumAccount) {
        return ownerEthereumAccounts[addr];
    }

    modifier onlyOwnerAddress(address addr) {
        require(ownerAccounts[addr] == true, ADDRESS_IS_NOT_OWNER);
        _;
    }

    function _grantOwnership(
        address addr,
        uint160 ethereumAccount
    ) internal {
        ownerAccounts[addr] = true;
        ownerEthereumAccounts[addr] = ethereumAccount;

        emit OwnershipGranted(addr);
    }

    function _removeOwnership(address addr) internal {
        delete ownerAccounts[addr];
        delete ownerEthereumAccounts[addr];

        emit OwnershipRemoved(addr);
    }

    function getAccounts()
        public
        view
    returns(
        address[] accounts,
        uint160[] ethereumAccounts
    ) {
        for ((address addr, bool status): ownerAccounts) {
            if (status) {
                accounts.push(addr);
                ethereumAccounts.push(ownerEthereumAccounts[addr]);
            }
        }
    }
}
