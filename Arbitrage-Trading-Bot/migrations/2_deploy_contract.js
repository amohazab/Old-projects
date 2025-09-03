const Flashloan = artifacts.require("Flashloan");

module.exports = function (deployer , netwrok , accounts) {
  deployer.deploy(
      Flashloan,
    "0x9AAb3f75489902f3a48495025729a0AF77d4b11e",
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    "0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E",
    "0x3E66B66Fd1d0b02fDa6C811Da9E0547970DB2f21",
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    accounts[0]
      );
};  
