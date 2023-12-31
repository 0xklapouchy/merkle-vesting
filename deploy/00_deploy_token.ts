import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { chainName, displayResult, dim, cyan, green, yellow } from "./utilities/utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, getChainId, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = parseInt(await getChainId());

  // 31337 is unit testing, 1337 is for coverage
  const isTestEnvironment = chainId === 31337 || chainId === 1337;

  cyan("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  cyan("            Token - Deploy");
  cyan("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n");

  dim(`network: ${chainName(chainId)} (${isTestEnvironment ? "local" : "remote"})`);
  dim(`deployer: ${deployer}`);

  cyan("\nDeploying Token Contract...");

  const tokenDeployResult = await deploy("ERC20Mock", {
    from: deployer,
    args: ["Test Token", "TEST", 18, "1000000000000000000000000000"],
    skipIfAlreadyDeployed: true,
  });

  displayResult("ERC20Mock", tokenDeployResult);

  const tokenContract = await ethers.getContractAt("ERC20Mock", tokenDeployResult.address);
  dim(`Deployer: ${deployer}`);
  yellow("\nDeployer balance:\n" + (await tokenContract.balanceOf(deployer)).toString());

  green(`\nDone!`);
};

export default func;
func.tags = ["Token"];
