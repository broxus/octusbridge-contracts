pragma ton-solidity ^0.39.0;


interface IRound {
    function relays() external responsible view returns(address[] relays_);
}
