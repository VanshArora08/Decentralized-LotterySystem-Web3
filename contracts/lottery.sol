//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

contract Lottery is VRFConsumerBaseV2 {
    //state variables
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    event Lottery_Enter(address indexed player);

    constructor(
        uint256 entranceFees,
        address vrfCoordinator
    ) VRFConsumerBaseV2(vrfCoordinator) {
        i_entranceFee = entranceFees;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator);
    }

    error lottery__NotEnoughETHEntered();

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert lottery__NotEnoughETHEntered();
        }
        s_players.push(payable(msg.sender));
        emit Lottery_Enter(msg.sender);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal virtual override {}

    function requestRandomWinner() external {
        //
    }

    function getPlayerAt(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getEntryFees() public view returns (uint256) {
        return i_entranceFee;
    }
}
