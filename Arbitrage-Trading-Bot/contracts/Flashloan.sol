pragma solidity >=0.5.0 <=0.8.0;
pragma experimental ABIEncoderV2;

import "@studydefi/money-legos/dydx/contracts/DydxFlashloanBase.sol";
import "@studydefi/money-legos/dydx/contracts/ICallee.sol";
import "@studydefi/money-legos/onesplit/contracts/IOneSplit.sol";
import "@studydefi/money-legos/balancer/contracts/ExchangeProxy.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IUniswapV2Router02.sol";
import "./IWeth.sol";
import { KyberNetworkProxy as IKyberNetworkProxy } from '@studydefi/money-legos/kyber/contracts/KyberNetworkProxy.sol';


contract Flashloan is ICallee, DydxFlashloanBase {

    enum DExchange{Kyber, Sushiswap, Balancer , Oneinch, Uniswap}

    struct ArbInfo {
        DExchange buyFrom;
        DExchange sellTo;
        address middleToken;
        uint256 repayAmount;
    }

    IKyberNetworkProxy kyber;
    IUniswapV2Router02 uniswap;
    IUniswapV2Router02 sushiswap;
    IOneSplit onesplit;
    ExchangeProxy balancerExchange;
    IWETH weth;
    TokenInterface wethTokenInterface;
    TokenInterface tokenTokenInterface;
    
    uint programCode = 12345;
    
    address beneficiary;
    address constant KYBER_ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    event newArbitrage(DExchange buyFrom , DExchange sellTo , address token , uint profit , uint date);

    constructor(
        address kyberAddress,
        address uniswapAddress,
        address sushiswapAddress,
        address onesplitAddress,
        address BalancerExchangeAddress,
        address wethAddress,
        address beneficiaryAddress
    ) public {
        kyber = IKyberNetworkProxy (kyberAddress);
        uniswap = IUniswapV2Router02 (uniswapAddress);
        sushiswap = IUniswapV2Router02(sushiswapAddress);
        onesplit = IOneSplit (onesplitAddress);
        balancerExchange = ExchangeProxy (BalancerExchangeAddress);
        wethTokenInterface = TokenInterface(wethAddress);
        weth = IWETH (wethAddress); 
        beneficiary = beneficiaryAddress;

    }

    // This is the function that will be called postLoan
    // i.e. Encode the logic to handle your flashloaned funds here
    function callFunction(
        address sender,
        Account.Info memory account,
        bytes memory data
    ) public override {
        ArbInfo memory arbInfo = abi.decode(data, (ArbInfo));
        uint256 balanceWeth = weth.balanceOf(address(this));

        // determine the middle token as the TOKEN ERC20 contract
        IERC20 TOKEN = IERC20(arbInfo.middleToken);

        // where to buy the token
        if(arbInfo.buyFrom == DExchange.Kyber){

            // buy TOKEN from kyber
            weth.approve(address(kyber) , balanceWeth );
            (uint expectedRate , ) = kyber.getExpectedRate(weth , TOKEN , balanceWeth);
            kyber.swapTokenToToken(weth , balanceWeth , TOKEN , expectedRate);

        } else if(arbInfo.buyFrom == DExchange.Uniswap){

            // buy TOKEN from uniswap
            weth.approve(address(uniswap) , balanceWeth );
            address[] memory path = new address[](2);
            path[0] = address(weth);
            path[1] = address(TOKEN);
            uint[] memory minOuts = uniswap.getAmountsOut(balanceWeth , path);
            uniswap.swapExactTokensForTokens(balanceWeth , minOuts[1] , path , address(this) , block.timestamp);

        } else if(arbInfo.buyFrom == DExchange.Sushiswap){

            // buy TOKEN from sushiswap
            weth.approve(address(sushiswap) , balanceWeth );
            address[] memory path = new address[](2);
            path[0] = address(weth);
            path[1] = address(TOKEN);
            uint[] memory minOuts = sushiswap.getAmountsOut(balanceWeth , path);
            sushiswap.swapExactTokensForTokens(balanceWeth , minOuts[1] , path , address(this) , block.timestamp);
            
        } else if(arbInfo.buyFrom == DExchange.Balancer){
            
            // buy TOKEN from balancer
            weth.approve(address(balancerExchange) , balanceWeth);

            ( , uint expectedBalancerAmount) = balancerExchange.viewSplitExactIn(
                address(weth), 
                address(TOKEN), 
                balanceWeth,
                10);

            balancerExchange.smartSwapExactIn(
                wethTokenInterface , 
                tokenTokenInterface,
                balanceWeth ,
                expectedBalancerAmount,
                10); 

        } else if(arbInfo.buyFrom == DExchange.Oneinch){
            weth.approve(address(onesplit) , balanceWeth);
            (uint onesplitReturn , uint[] memory dist) = onesplit.getExpectedReturn(
                weth,
                TOKEN,
                balanceWeth,
                100,
                0
            );
            onesplit.swap(
                weth,
                TOKEN,
                balanceWeth,
                onesplitReturn,
                dist,
                0
            );
        }

        // where to sell TOKEN
        if(arbInfo.sellTo == DExchange.Kyber){

            // sell TOKEN to kyber
            TOKEN.approve(address(kyber) , TOKEN.balanceOf(address(this)));
            (uint expectedRate , ) = kyber.getExpectedRate(TOKEN , weth , TOKEN.balanceOf(address(this)));
            kyber.swapTokenToToken(TOKEN , TOKEN.balanceOf(address(this)) , weth , expectedRate);

        } else if(arbInfo.sellTo == DExchange.Uniswap){

            // sell TOKEN to uniswap
            TOKEN.approve(address(uniswap) , TOKEN.balanceOf(address(this)));
            address[] memory path = new address[](2);
            path[0] = address(TOKEN);
            path[1] = address(weth);
            uint[] memory minOuts = uniswap.getAmountsOut(TOKEN.balanceOf(address(this)) , path);
            uniswap.swapExactTokensForTokens(TOKEN.balanceOf(address(this)) , minOuts[1] , path , address(this) , block.timestamp);
        
        } else if(arbInfo.sellTo == DExchange.Sushiswap){

            // sell TOKEN to sushiswap
            TOKEN.approve(address(sushiswap) , TOKEN.balanceOf(address(this)));
            address[] memory path = new address[](2);
            path[0] = address(TOKEN);
            path[1] = address(weth);
            uint[] memory minOuts = sushiswap.getAmountsOut(TOKEN.balanceOf(address(this)) , path);
            sushiswap.swapExactTokensForTokens(TOKEN.balanceOf(address(this)) , minOuts[1] , path , address(this) , block.timestamp);
       
        } else if(arbInfo.sellTo == DExchange.Balancer){

            // sell TOKEN to balancer
            TOKEN.approve(address(balancerExchange) , TOKEN.balanceOf(address(this)));

            ( , uint expectedBalancerAmount) = balancerExchange.viewSplitExactIn(
                address(TOKEN), 
                address(weth), 
                TOKEN.balanceOf(address(this)),
                10);

            balancerExchange.smartSwapExactIn(
                tokenTokenInterface , 
                wethTokenInterface,
                TOKEN.balanceOf(address(this)) ,
                expectedBalancerAmount,
                10);


        } else if(arbInfo.sellTo == DExchange.Oneinch){

            // sell TOKEN to Oneinch
            TOKEN.approve(address(onesplit) , TOKEN.balanceOf(address(this)));
            (uint onesplitReturn , uint[] memory dist) = onesplit.getExpectedReturn(
                TOKEN,
                weth,
                TOKEN.balanceOf(address(this)),
                100,
                0
            );
            onesplit.swap(
                TOKEN,
                weth,
                TOKEN.balanceOf(address(this)),
                onesplitReturn,
                dist,
                0
            );
        }

        
        require(
            weth.balanceOf(address(this)) > arbInfo.repayAmount,
            "Not enough funds to return the DY/DX flashloan" 
            );

        // calculate profit and withraw it
        uint profit = weth.balanceOf(address(this)) - arbInfo.repayAmount;
        weth.transfer(beneficiary , profit);
        emit newArbitrage( arbInfo.buyFrom , arbInfo.sellTo , arbInfo.middleToken , profit , block.timestamp);   
    }

    function initiateFlashloan(
        address _solo,
        address _token,
        uint256 _amount,
        DExchange _buyFrom,
        DExchange _sellTo,
        address _middleToken
          )
        external
    {
        ISoloMargin solo = ISoloMargin(_solo);

        // Get marketId from token address
        uint256 marketId = _getMarketIdFromTokenAddress(_solo, _token);

        // Calculate repay amount (_amount + (2 wei))
        // Approve transfer from
        uint256 repayAmount = _getRepaymentAmountInternal(_amount);
        IERC20(_token).approve(_solo, repayAmount);

        // 1. Withdraw $
        // 2. Call callFunction(...)
        // 3. Deposit back $
        Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

        operations[0] = _getWithdrawAction(marketId, _amount);
        operations[1] = _getCallAction(
            // Encode MyCustomData for callFunction
            abi.encode(ArbInfo({buyFrom: _buyFrom , sellTo: _sellTo , middleToken: _middleToken, repayAmount: repayAmount}))
        );
        operations[2] = _getDepositAction(marketId, repayAmount);

        Account.Info[] memory accountInfos = new Account.Info[](1);
        accountInfos[0] = _getAccountInfo();

        solo.operate(accountInfos, operations);
    }

    fallback() external payable {  }
}