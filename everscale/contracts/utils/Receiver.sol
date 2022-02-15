pragma ton-solidity >= 0.39.0;

pragma AbiHeader pubkey;
pragma AbiHeader expire;

import "./DummyRound.sol";
interface IRound {
    function relayKeys() external view responsible returns (uint256[]);
    function relayKeysSimple() external view responsible returns (uint256[]);
}


contract Receiver {
    uint256 static _randomNonce;
    uint256 requiredVotes;
    mapping (uint256 => uint256) votes;

    constructor() public {
        tvm.accept();
    }

    function fetchRelays(address roundContract) public {
        tvm.accept();
        IRound(roundContract).relayKeysSimple{
            value: 2 ton,
            callback: Receiver.receiveRoundRelays
        }();
    }

    function receiveRoundRelays(uint[] keys) public {
        requiredVotes = uint16(keys.length * 2 / 3) + 1;

        for (uint key: keys) {
            votes[key] = key;
        }
    }
}

