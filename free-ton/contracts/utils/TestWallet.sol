pragma ton-solidity >= 0.39.0;
pragma AbiHeader pubkey;
pragma AbiHeader expire;


import './Wallet.sol';


contract TestWallet is Wallet {
    address public static fabric;

    constructor(uint256 owner_pubkey) public {
        setOwnership(owner_pubkey);
    }
}
