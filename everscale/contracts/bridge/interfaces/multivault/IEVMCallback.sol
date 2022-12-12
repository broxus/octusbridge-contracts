pragma ton-solidity >= 0.39.0;


interface IEVMCallback {
    struct EVMCallback {
        uint160 recipient;
        TvmCell payload;
        bool strict;
    }
}
