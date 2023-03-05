// const assert = require('assert');
const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers } = require('hardhat');
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("lottery unit tests", async () => {
        let lottery, vrfCoordinatorV2Mock, deployer, lotteryEntranceFee, interval
        const chainId = network.config.chainId;

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer;
            await deployments.fixture(["all"])
            lottery = await ethers.getContract("Lottery", deployer)
            interval = await lottery.getInterval();
            lotteryEntranceFee = lottery.getEntranceFee();
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)

        })

        describe("constructor", async () => {

            it("Initializes Lottery contract correctly", async () => {
                const lotteryState = await lottery.getLotteryState();
                // const interval = await lottery.getInterval();
                assert.equal(interval.toString(), networkConfig[chainId]["keepersUpdateInterval"])
                assert.equal(lotteryState.toString(), "0");
            })
        })
        describe("Enter Lottery Function", async () => {
            it("reverts if you don't pay enough", async () => {
                await expect(lottery.enterLottery()).to.be.revertedWith("lottery__NotEnoughETHEntered");
            })
            it("Records the entry of player when he pays enough", async () => {
                await lottery.enterLottery({ value: lotteryEntranceFee })
                const playerJoined = await lottery.getPlayerAt(0)
                assert.equal(playerJoined, deployer)
            })
            it("emits the entrance event when a player enters the lottery", async () => {
                await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.emit(lottery, "Lottery_Enter")
            })
            it("denies entry when calculating winner", async () => {
                await lottery.enterLottery({ value: lotteryEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", []);
                await lottery.performUpkeep([]);
                await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.be.revertedWith("lottery__LotteryNotOpen")

            })

        })
        describe("Check Upkeep", async () => {

        })

    })