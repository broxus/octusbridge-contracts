pragma ton-solidity >= 0.39.0;


import "./../interfaces/IStaking.sol";
import "./../interfaces/IRound.sol";


import "@broxus/contracts/contracts/utils/RandomNonce.sol";
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";


/*
    @title Staking contract mockup
    Simply approve each event action without any real checks
*/
contract StakingMockup is IStaking, IRound, RandomNonce {
    uint[] public static __keys;

    /*
        @dev Get round contract address by it's id
        @param eventTimestamp Event creation timestamp
        @return roundContract Round contract
    */
    function getRelayRoundAddressFromTimestamp(
        uint32
    )
        override
        public
        view
        responsible
    returns (
        address roundContract, uint32 roundNum
    ) {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} (address(this), roundNum);
    }

    /*
        @dev Get list of current round relays public keys
        @return _keys Round relays Everscale public keys
    */
    function relayKeys()
        override
        public
        view
        responsible
    returns (
        uint[] _keys
    ) {
        return{value: 0, bounce: false, flag: MsgFlag.REMAINING_GAS} __keys;
    }
}
