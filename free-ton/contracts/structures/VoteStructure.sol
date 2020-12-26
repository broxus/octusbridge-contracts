pragma solidity >= 0.6.0;
pragma AbiHeader expire;


interface VoteStructure {
    struct Vote {
        bytes signature;
        bytes payload;
    }
}
