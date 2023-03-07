const { network, ethers } = require("hardhat");
const { verify } = require("../utils/verify")
const {
    networkConfig,
    developmentChains,
} = require("../helper-hardhat-config");
const FUND_AMOUNT = ethers.utils.parseEther("1")
module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;
    const chainId = network.config.chainId;

    if (chainId == 31337) {
        // create VRFV2 Subscription
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        //getting subscription for mock
        subscriptionId = transactionReceipt.events[0].args.subId;
        // funding subscriptionId of mock with fund amount
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }
    const arguments = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId]["gasLane"],
        networkConfig[chainId]["keepersUpdateInterval"],
        networkConfig[chainId]["raffleEntranceFee"],
        networkConfig[chainId]["callbackGasLimit"],
    ]

    const lottery = await deploy("Lottery", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: network.config.blockConfirmation || 1
    })
    if (chainId == 31337) {
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId.toNumber(), lottery.address)
    }

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(lottery.address, arguments)
    }
}
module.exports.tags = ["all", "raffle"];