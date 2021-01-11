pragma solidity ^0.6.0;


import "./SafeMath.sol";
import "./SafeERC20.sol";
import "./../interfaces/IToken.sol";


library UniversalERC20 {
    using SafeMath for uint256;
    using SafeERC20 for IToken;

    function universalTransferFrom(IToken token, address from, address to, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        token.safeTransferFrom(from, to, amount);
    }

    function universalTransfer(
        IToken token,
        address to,
        uint256 amount
    ) internal {
        universalTransfer(token, to, amount, false);
    }

    function universalTransfer(
        IToken token,
        address to,
        uint256 amount,
        bool mayFail
    ) internal returns(bool) {
        if (amount == 0) {
            return true;
        }

        token.safeTransfer(to, amount);
        return true;
    }
}
