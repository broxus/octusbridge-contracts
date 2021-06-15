pragma ton-solidity ^0.39.0;


interface IStaking {
    function deriveRoundAddress(
        uint32 round
    ) external responsible view returns(address roundContract);
}
