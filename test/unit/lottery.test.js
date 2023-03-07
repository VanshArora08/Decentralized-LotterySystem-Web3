// const assert = require('assert');
const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require('hardhat');
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("lottery unit tests", async () => {
        let lottery, vrfCoordinatorV2Mock, deployer, lotteryEntranceFee, interval, accounts, lotteryContract, vrfCoordinatorV2MockContract
        const chainId = network.config.chainId;

        beforeEach(async () => {
            accounts = await ethers.getSigners();
            deployer = (await getNamedAccounts()).deployer;
            await deployments.fixture(["all"])
            lottery = await ethers.getContract("Lottery")
            lotteryContract = await ethers.getContract("Lottery")
            interval = await lottery.getInterval();
            lotteryEntranceFee = await lottery.getEntranceFee();
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", accounts[1])
            vrfCoordinatorV2MockContract = await ethers.getContract("VRFCoordinatorV2Mock")

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
                assert.equal(playerJoined, await lottery.getPlayerAt(0))
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
            it("returns false if no one enters the lottery ", async () => {
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", []);
                const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
                // expect(await lottery.callStatic.checkUpkeep([])).to.be.revertedWith("lottery__UpkeepNotNeeded")
                assert(!upkeepNeeded)
            })
            it("returns false if lottery is not open", async () => {
                await lottery.enterLottery({ value: lotteryEntranceFee })
                // await 
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", [])
                await lottery.performUpkeep("0x");
                const lotteryState = await lottery.getLotteryState();
                const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                assert.equal(lotteryState.toString(), "1")
                assert.equal(upkeepNeeded, false)
            })
            it("returns false if not enough time has passed", async () => {
                await lottery.enterLottery({ value: lotteryEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() - 1])
                await network.provider.send("evm_mine", []);
                const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
                assert(upkeepNeeded, false)
            })
            it("returns true if enough time has passed", async () => {
                await lottery.enterLottery({ value: lotteryEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", []);
                const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
                assert(upkeepNeeded)
            })
        })
        describe("fulfillRandomWords", () => {
            beforeEach(async () => {
                await lottery.enterLottery({ value: lotteryEntranceFee });
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);
            })
            it("can Only be called after performUpkeep", async () => {
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)).to.be.revertedWith("nonexistent request")
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)).to.be.revertedWith("nonexistent request")
            })

            it("picks a winner, resets, and sends money", async () => {
                const additionalEntrances = 3
                const startingIndex = 2
                for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                    lottery = lotteryContract.connect(accounts[i])
                    await lottery.enterLottery({ value: lotteryEntranceFee })
                }
                const startingTimeStamp = await lottery.getLastTimeStamp()

                await new Promise(async (resolve, reject) => {
                    lottery.once("WinnerPicked", async () => {
                        console.log("WinnerPicked event fired!")

                        try {
                            const recentWinner = await lottery.getRecentWinner()
                            const raffleState = await lottery.getLotteryState()
                            const winnerBalance = await accounts[2].getBalance()
                            const endingTimeStamp = await lottery.getLastTimeStamp()
                            await expect(lottery.getPlayerAt(0)).to.be.reverted
                            assert.equal(recentWinner.toString(), accounts[2].address)
                            assert.equal(raffleState, 0)
                            assert.equal(
                                winnerBalance.toString(),
                                startingBalance.add(lotteryEntranceFee.mul(additionalEntrances).add(lotteryEntranceFee)).toString()
                            )
                            assert(endingTimeStamp > startingTimeStamp)
                            resolve()
                        } catch (e) {
                            reject(e)
                        }
                    })
                    const tx = await lottery.performUpkeep("0x")
                    const txReceipt = await tx.wait(1)
                    const startingBalance = await accounts[2].getBalance()
                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        txReceipt.events[1].args.requestId,
                        lottery.address
                    )
                })
            })
        })

    })