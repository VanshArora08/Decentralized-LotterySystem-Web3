//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

// pragma solidity ^0.8.7;

// import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
// import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
// import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";
// import "hardhat/console.sol";

contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
    //enums
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    //state variables
    uint256 private immutable i_entranceFee;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    address payable[] private s_players;
    LotteryState private s_lotteryState;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_timeInterval;

    //lottery variables
    address private s_recentWinner;

    //events
    event Lottery_Enter(address indexed player);
    event RequestedLotteryWinner(uint256 requestId);

    //constructor
    constructor(
        address vrfCoordinator,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint256 interval,
        uint256 entranceFees,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinator) {
        i_entranceFee = entranceFees;
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator);
        s_lotteryState = LotteryState.OPEN;
        i_timeInterval = interval;
        s_lastTimeStamp = block.timestamp;
    }

    //errors
    error lottery__NotEnoughETHEntered();
    error lottery__TransactionFailed();
    error lottery__LotteryNotOpen();
    error lottery__UpkeepNotNeeded(
        uint256 currentBalance,
        uint256 noOfPlayers,
        uint256 lotteryState
    );

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert lottery__NotEnoughETHEntered();
        }
        if (s_lotteryState != LotteryState.OPEN) {
            revert lottery__LotteryNotOpen();
        }
        s_players.push(payable(msg.sender));
        emit Lottery_Enter(msg.sender);
    }

    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory /*performData*/)
    {
        bool isOpen = (LotteryState.OPEN == s_lotteryState);
        bool hasPlayers = (s_players.length > 0);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) >
            i_timeInterval);
        bool hasBalance = (address(this).balance > 0);
        upkeepNeeded = (isOpen && timePassed && hasBalance && hasPlayers);
        if (!upkeepNeeded) {
            revert lottery__UpkeepNotNeeded(
                address(this).balance,
                uint256(s_players.length),
                uint256(s_lotteryState)
            );
        }
        // return (upkeepNeeded);
    }

    function performUpkeep(bytes calldata /*performdata*/) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        s_lotteryState = LotteryState.CALCULATING;
        // bytes calldata x;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        if (!upkeepNeeded) {
            revert lottery__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_lotteryState)
            );
        }
        emit RequestedLotteryWinner(requestId);
    }

    function fulfillRandomWords(
        uint256 /*requestId*/,
        uint256[] memory randomWords
    ) internal virtual override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable winner = s_players[indexOfWinner];
        s_recentWinner = winner;
        s_lotteryState = LotteryState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = winner.call{value: address(this).balance}("");
        if (!success) {
            revert lottery__TransactionFailed();
        }
    }

    //getter functions
    function getPlayerAt(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getEntryFees() public view returns (uint256) {
        return i_entranceFee;
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getLotteryState() public view returns (LotteryState) {
        return s_lotteryState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getNoOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    // function performUpkeep(bytes calldata /*performData*/) external override {}
}
