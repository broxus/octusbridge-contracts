pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;


contract RedButton {
    function externalCallEth(
        address payable[] memory  _to,
        bytes[] memory _data,
        uint256[] memory weiAmount
    ) public payable {
        require(_to.length == _data.length && _data.length == weiAmount.length, "Parameters should be equal length");

        for(uint16 i = 0; i < _to.length; i++) {
            _cast(_to[i], _data[i], weiAmount[i]);
        }
    }

    function _cast(
        address payable _to,
        bytes memory _data,
        uint256 weiAmount
    ) internal {
        bytes32 response;

        assembly {
            let succeeded := call(sub(gas(), 5000), _to, weiAmount, add(_data, 0x20), mload(_data), 0, 32)
            response := mload(0)
            switch iszero(succeeded)
            case 1 {
                revert(0, 0)
            }
        }
    }
}
