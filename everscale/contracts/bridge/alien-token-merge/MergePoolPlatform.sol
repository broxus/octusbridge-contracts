pragma ton-solidity >= 0.39.0;


import '@broxus/contracts/contracts/utils/RandomNonce.sol';


contract MergePoolPlatform is RandomNonce {
    address static proxy;

    constructor(
        TvmCell code,
        uint8 version,
        address[] tokens_,
        uint256 canonId,
        address owner_,
        address manager_
    ) public {
        require(msg.sender == proxy);

        initialize(
            code,
            version,
            tokens_,
            canonId,
            owner_,
            manager_
        );
    }

    function initialize(
        TvmCell code,
        uint8 version,
        address[] tokens_,
        uint256 canonId,
        address owner_,
        address manager_
    ) private {
        TvmCell data = abi.encode(
            proxy,
            _randomNonce,
            version,
            tokens_,
            canonId,
            owner_,
            manager_
        );

        tvm.setcode(code);
        tvm.setCurrentCode(code);

        onCodeUpgrade(data);
    }

    function onCodeUpgrade(TvmCell data) private {}
}
