import { ethers } from "hardhat";
import { TestPath } from "../typechain-types";
describe("测试", () => {
  // 部署Test合约
  let test: TestPath;
  before(async () => {
    const Test = await ethers.getContractFactory("TestPath");
    test = await Test.deploy();
    await test.deploymentTransaction()?.wait();
    console.log("Contract deployed!");
  });
  // 执行exc
  it("执行exc", async () => {
    const result = await test.exc();
    console.log(result);
  });
});
