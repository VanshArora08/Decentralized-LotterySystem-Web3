//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract Lottery {
    //state variables
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;

    constructor(uint256 entranceFees) {
        i_entranceFee = entranceFees;
    }

    error lottery__NotEnoughETHEntered();

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert lottery__NotEnoughETHEntered();
        }
        s_players.push(payable(msg.sender));
    }
}
