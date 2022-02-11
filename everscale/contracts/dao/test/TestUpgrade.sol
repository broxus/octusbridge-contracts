pragma ton-solidity >= 0.39.0;



contract TestTarget {
    TvmCell public storedData;
    bool public isUpgraded;

    constructor () public {}

    function onCodeUpgrade(TvmCell data) private {
        storedData = data;
        isUpgraded = true;
    }

}
