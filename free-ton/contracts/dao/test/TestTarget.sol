pragma ton-solidity ^0.39.0;


contract TestTarget {
    uint32 static _nonce;

    address public daoRoot;
    bool public executed;
    uint128 public value;
    uint32 public param;

    constructor (address _daoRoot) public {
        tvm.accept();
        daoRoot = _daoRoot;
    }

    function onProposalSuccess(uint32 newParam) public {
        require(msg.sender == daoRoot, 101);
        value = msg.value;
        executed = true;
        param = newParam;
    }

    function encodePayload(uint32 newParam) public pure returns (TvmCell) {
        return tvm.encodeBody(onProposalSuccess, newParam);
    }
}
