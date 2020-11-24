pragma solidity >= 0.5.0;
pragma AbiHeader expire;


contract Target {
    uint public nonce;
    uint state;
    bytes[] author;

    constructor() public {
        require(tvm.pubkey() != 0);
        tvm.accept();

        state = 0;
    }

    function setState(uint newState, bytes[] newAuthor) public {
        state = newState;
        author = newAuthor;
    }

    function getState() external view returns(uint, bytes[]) {
        return (state, author);
    }
}
