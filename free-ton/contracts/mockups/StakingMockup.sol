pragma ton-solidity ^0.39.0;


import "./../interfaces/IStaking.sol";
import "./../interfaces/IRound.sol";


import "./../../../node_modules/@broxus/contracts/contracts/utils/RandomNonce.sol";
import "./../../../node_modules/@broxus/contracts/contracts/libraries/MsgFlag.sol";


/*
    @title Staking contract mockup
    Simply approve each event action without any real checks
*/
contract StakingMockup is IStaking, IRound, RandomNonce {
    address[] public static __relays;

    /*
        @notice Get round contract address by it's id
        @param roundId Round id
        @returns roundContract Round contract
    */
    function deriveRoundAddress(
        uint32 round
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
        @notice Get list of round relays
        @returns _relays List of relays TON addresses
    */
    function relays()
        override
        public
        view
        responsible
    returns (
        address[] _relays
    ) {
        return {value: 0, flag: 64} __relays;
    }
}
