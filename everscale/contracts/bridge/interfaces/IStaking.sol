pragma ton-solidity >= 0.39.0;


interface IStaking {
    function getRelayRoundAddressFromTimestamp(
        uint32 time
    ) external responsible view returns(address roundContract, uint32 roundNum);
}
