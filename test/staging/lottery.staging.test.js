const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require('hardhat');
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("lottery unit tests", async () => {
        let lottery, deployer, lotteryEntranceFee, accounts

        beforeEach(async () => {
            accounts = await ethers.getSigners();
            deployer = (await getNamedAccounts()).deployer;
            // await deployments.fixture(["all"])
            lottery = await ethers.getContract("Lottery", deployer)
            // lotteryContract = await ethers.getContract("Lottery")
            // interval = await lottery.getInterval();
            lotteryEntranceFee = await lottery.getEntranceFee();
            // vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", accounts[1])
            // vrfCoordinatorV2MockContract = await ethers.getContract("VRFCoordinatorV2Mock")

        })
        describe("fullfill random words", () => {
            it("works with live chainlink keepers and chainlink vrf, we get a random winner", async () => {
                const startingTimeStamp = lottery.getLastTimeStamp();
                await new Promise(async (resolve, reject) => {
                    raffle.once("WinnerPicked", async () => {
                        console.log("winner picked event fired");
                        resolve();
                        try {
                            const recentWinner = await lottery.getRecentWinner();
                            const lotteryState = await lottery.getLotteryState();
                            const winnerEndingBalance = await accounts[0].getBalance();
                            const endingTimeStamp = await lottery.getLastTimeStamp();

                            await expect(lottery.getPlayerAt(0)).to.be.reverted
                            assert.equal(recentWinner.toString(), accounts[0].address);
                            assert.equal(lotteryState.toString, "0");
                            assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(lotteryEntranceFee).toString());
                            assert.equal(endingTimeStamp > startingTimeStamp);
                            resolve();
                        } catch (e) {
                            console.log(e)
                            reject(e)
                        }
                    })
                    await lottery.enterLottery({ value: lotteryEntranceFee })
                    const winnerStartingBalance = await accounts[0].getBalance();
                })
            })
        })
    }
    )