import { ethers } from "hardhat";
import { Test } from "../typechain-types";
describe("测试", () => {
  // 部署Test合约
  let test: Test;
  before(async () => {
    const Test = await ethers.getContractFactory("Test");
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
