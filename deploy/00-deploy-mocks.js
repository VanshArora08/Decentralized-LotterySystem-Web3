
// const { networkConfig, developmentChains } = require("../helper-hardhat-config");
const { network } = require("hardhat");
// const { base58 } = require("ethers/lib/utils");

const BaseFee = ethers.utils.parseEther("0.25");
const GasPerLink = 1e9;
// const args = [BaseFee, GasPerLink];

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    if (chainId == 31337) {
        console.log("deploying on development chains");
        await deploy('VRFCoordinatorV2Mock', {
            from: deployer,
            args: [BaseFee, GasPerLink],
            log: true,
        })
        log("Mocks Deployed")
        log("-------------------------------------------------------")
    }

}
module.exports.tags = ["all", "mocks"]