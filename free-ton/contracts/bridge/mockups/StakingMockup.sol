pragma ton-solidity ^0.39.0;


import "./../interfaces/IStaking.sol";
import "./../interfaces/IRound.sol";


import "./../../../../node_modules/@broxus/contracts/contracts/utils/RandomNonce.sol";
import "./../../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol";


/*
    @title Staking contract mockup
    Simply approve each event action without any real checks
*/
contract StakingMockup is IStaking, IRound, RandomNonce {
    uint[] public static __keys;

    /*
        @notice Get round contract address by it's id
        @param eventTimestamp Event creation timestamp
        @returns roundContract Round contract
    */
    function deriveRoundAddress(
        uint32 eventTimestamp
    )
        override
        public
        view
        responsible
    returns (
        address roundContract
    ) {
        return {value: 0, flag: 64} address(this);
    }

    /*
        @notice Get list of current round relays public keys
        @returns _keys Round relays TON public keys
    */
    function relayKeys()
        override
        public
        view
        responsible
    returns (
        uint[] _keys
    ) {
        return {value: 0, flag: 64} __keys;
    }
}
