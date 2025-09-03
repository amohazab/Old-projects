require('dotenv').config();
const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
);
web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);

/*
const kyberRobstenAddress = "0xd719c34261e099Fdb33030ac8909d5788D3039C4";
const uniswapAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
const sushiswapAddress = "0x99E2F16626C13320E9bEE7f353420646202ffbbE", ***
const onesplitAddress = "0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E", ***
const BalancerBPoolAddress = , ***
const BalancerExchangeAddress, ***
const wethAddress = "0x0a180a76e4466bf68a7f86fb029bed3cccfaaac5",
const beneficiaryAddress = 0x3B913c81496495aBB2f7ec1dE91aF2DA38205E83


*/
// import all the contracts
// import oneInch contract
const oneinchAddress = '0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E';
const oneinchABI = require('./abis/onesplit.json');
const oneinch = new web3.eth.Contract(oneinchABI , oneinchAddress);

//import uniswap contract
const uniswapRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const uniswapRouterABI = require('./abis/UniswapV2Router.json');
const uniswap = new web3.eth.Contract(uniswapRouterABI, uniswapRouterAddress);

//import sushiswap contract
const sushiswapRouterAddress = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";
const sushiswap = new web3.eth.Contract(uniswapRouterABI , sushiswapRouterAddress);

//import kyber contract
const kyberAddress = "0x9AAb3f75489902f3a48495025729a0AF77d4b11e";
const kyberABI = require('./abis/kyberProxy2.json');
const kyber = new web3.eth.Contract(kyberABI , kyberAddress);

// import balancer contract
const balancerAddress = '0x3E66B66Fd1d0b02fDa6C811Da9E0547970DB2f21';
const balancerABI = require('./abis/balancerExchange.json');
const balancer = new web3.eth.Contract(balancerABI , balancerAddress);
var BN = web3.utils.BN;

async function checkPair(args){
    const { TOKENSymbol , TOKENAddress , TOKENDecimal} = args;
    let balancerExist;
    if( TOKENSymbol == 'USDT' || TOKENSymbol == 'YFI' || TOKENSymbol == 'CRV'|| TOKENSymbol == 'BAND'||TOKENSymbol == 'COMP'|| TOKENSymbol == 'OMG'|| TOKENSymbol == 'sUSD' ){
        balancerExist = 0;
    } else{
        balancerExist = 1;
    }

    /*const inputEther = [5 , 10 , 15 , 20 , 25 , 30]; */
    const wethSymbol = 'Weth';
    const wethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const wethDecimal = 18;

    const inputEther = 10;
//const inputAmount = web3.utils.toWei(inputEther.toString(), 'ETHER');
const inputAmount = inputEther*(Math.pow(10 , wethDecimal));
//let finalProfit=0
   async function determineArbitrage(DEX , TOKENPrice){
       let profit=0;
       let wethWeiAmount;
       if(TOKENSymbol == "WBTC"){
        let wethAmount = TOKENPrice*(Math.pow(10 , TOKENDecimal));
        wethWeiAmount = new BN(wethAmount).toString();
       } else{
        wethWeiAmount = web3.utils.toWei(TOKENPrice.toString() , 'Ether');}

        //compare with kyber
        if(DEX != 'kyber'){
            let kyberReverseResult = await kyber.methods.getExpectedRate(
                TOKENAddress, 
                wethAddress , 
                wethWeiAmount.toString()).call();
                //console.log(kyberReverseResult);
            let kyberPrice = (parseInt(kyberReverseResult.expectedRate))/(Math.pow(10 , wethDecimal)); //await web3.utils.fromWei(kyberReverseResult.expectedRate, 'Ether');
            let kyberFinalRate = kyberPrice*TOKENPrice;
            if(kyberFinalRate>inputEther){
              profit = kyberFinalRate - inputEther;
              console.log( 'buy from ' + DEX + 'sell to kyber ' + 'with profit ' +  profit);
              //console.log(DEX , "kyber" , TOKENSymbol , kyberFinalRate , profit);
            }
            //console.log(DEX ,"kyber" , TOKENSymbol, kyberFinalRate);
        }
        // compare with uniswap
        if(DEX != 'uniswap'){
            let uniswapReverseResult = await uniswap.methods.getAmountsOut(wethWeiAmount.toString() ,
                [TOKENAddress , wethAddress]).call();
           const uniswapFinalPrice = uniswapReverseResult[1]/((Math.pow(10 , wethDecimal))); 
           if(uniswapFinalPrice>inputEther){
            profit = uniswapFinalPrice - inputEther;
           console.log( 'buy from ' + DEX + 'sell to uniswap ' + 'with profit ' +  profit);
          }
           
        }

        //compare with sushiswap
        if(DEX !='sushiswap'){
            let sushiswapReverseResult = await sushiswap.methods.getAmountsOut(wethWeiAmount.toString() ,
                [TOKENAddress , wethAddress]).call();
           const sushiswapFinalPrice = sushiswapReverseResult[1]/((Math.pow(10 , wethDecimal))); 
           if(sushiswapFinalPrice>inputEther){
            profit = sushiswapFinalPrice - inputEther;
            console.log(profit);
            console.log( 'buy from ' + DEX + 'sell to sushiswap ' + 'with profit ' +  profit);
          }
        }

        //compare with balancer
        if(DEX !='balancer' , balancerExist==1){
            const balancerReverseResult = await balancer.methods.viewSplitExactIn(TOKENAddress ,
                wethAddress , 
                wethWeiAmount.toString() , 
                2).call();
           const balancerFinalPrice = balancerReverseResult['1']/(Math.pow(10 , wethDecimal));
           if(balancerFinalPrice>inputEther){
            profit = balancerFinalPrice - inputEther;
            console.log( 'buy from ' + DEX + 'sell to balancer ' + 'with profit ' +  profit);
            //console.log(DEX , "balancer" , TOKENSymbol , balancerFinalPrice , profit);
        }
      }

        // compare with oneInch
        if(DEX != 'oneinch'){
            const oneinchReverseResult = await oneinch.methods.getExpectedReturn(TOKENAddress, wethAddress , wethWeiAmount.toString() , 100, 0).call();
            const oneinchFinalPrice = (oneinchReverseResult.returnAmount)/(Math.pow(10 , wethDecimal));
            if(oneinchFinalPrice>inputEther){
              profit = oneinchFinalPrice - inputEther;
              console.log( 'buy from ' + DEX + 'sell to oneinch ' + 'with profit ' +  profit);
              //console.log(DEX , "oneinch" , TOKENSymbol , oneinchFinalPrice , profit);
          }
        }
    }
    

    //kyber prices
    let kyberResult = await kyber.methods.getExpectedRate(
        wethAddress, 
        TOKENAddress , 
        inputAmount.toString()).call();
     let kyberRate = kyberResult.expectedRate;
     let kyberPrice = (parseInt(kyberRate))/(Math.pow(10 , wethDecimal));
     //let kyberPrice = await web3.utils.fromWei(kyberRate, 'Ether');
     //console.log("kyber price " + kyberPrice);

    //uniswap prices
    let uniswapResult = await uniswap.methods.getAmountsOut(inputAmount.toString() ,
         [wethAddress , TOKENAddress]).call();
    const uniswapPrice = uniswapResult[1]/((Math.pow(10 , TOKENDecimal))); 
    //console.log("uniswap price " + uniswapPrice);

    //sushiswap prices
    let sushiswapResult = await sushiswap.methods.getAmountsOut(inputAmount.toString() ,
        [wethAddress , TOKENAddress]).call();
    const sushiswapPrice = sushiswapResult[1]/((Math.pow(10 , TOKENDecimal)));
      //  console.log("sushiswap price " + sushiswapPrice);
    //balancer prices
    let balancerPrice;
    if(balancerExist==1){
    const balancerResult = await balancer.methods.viewSplitExactIn(wethAddress ,
         TOKENAddress , 
         inputAmount.toString() , 
         10).call();
    balancerPrice = balancerResult['1']/(Math.pow(10 , TOKENDecimal));
    //console.log("balancer price " + balancerPrice);
    }

    //oneInch prices
    const oneinchResult = await oneinch.methods.getExpectedReturn(wethAddress, TOKENAddress , inputAmount.toString(), 100, 0).call();
    const oneinchPrice = (oneinchResult.returnAmount)/(Math.pow(10 , TOKENDecimal));
    //console.log("oneinch price " + oneinchPrice);

    // determine arbitrage
    determineArbitrage('kyber' , kyberPrice*inputEther);
    determineArbitrage('uniswap' , uniswapPrice);
    determineArbitrage('sushiswap' , sushiswapPrice);
    if(balancerExist==1){
    determineArbitrage('balancer' , balancerPrice);}
    determineArbitrage('oneinch' , oneinchPrice);

}

let priceMonitor
let monitoringPrice = false

async function checkAllPairs(){

  if(monitoringPrice == false){

    console.log('checking prices...')
    monitoringPrice = true

    try{

    await checkPair({
        TOKENSymbol: 'DAI',
        TOKENAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
        TOKENDecimal: 18
    });

      
      await checkPair({
        TOKENSymbol: 'LINK',
        TOKENAddress: '0x514910771af9ca656af840dff83e8264ecf986ca',
        TOKENDecimal: 18
      });   
      

      await checkPair({
        TOKENSymbol: 'WBTC',
        TOKENAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        TOKENDecimal: 8
      });
      

      await checkPair({
        TOKENSymbol: 'COMP',
        TOKENAddress: '0xc00e94cb662c3520282e6f5717214004a7f26888',
        TOKENDecimal: 18
      });
      
      
      await checkPair({
        TOKENSymbol: 'BAND',
        TOKENAddress: '0xba11d00c5f74255f56a5e366f4f77f5a186d7f55',
        TOKENDecimal: 18
      });
      
await checkPair({
    TOKENSymbol: 'MKR',
    TOKENAddress: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
    TOKENDecimal: 18
  });
  
  
  await checkPair({
    TOKENSymbol: 'UNI',
    TOKENAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    TOKENDecimal: 18
  });
  
  
  await checkPair({
    TOKENSymbol: 'YFI',
    TOKENAddress: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
    TOKENDecimal: 18
  });
  
  await checkPair({
    TOKENSymbol: 'SNX',
    TOKENAddress: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
    TOKENDecimal: 18
  });

  await checkPair({
    TOKENSymbol: 'PNK',
    TOKENAddress: '0x93ed3fbe21207ec2e8f2d3c3de6e058cb73bc04d',
    TOKENDecimal: 18
  });

  await checkPair({
    TOKENSymbol: 'OMG',
    TOKENAddress: '0xd26114cd6EE289AccF82350c8d8487fedB8A0C07',
    TOKENDecimal: 18,
  });  

  await checkPair({
    TOKENSymbol: 'REN',
    TOKENAddress: '0x408e41876cccdc0f92210600ef50372656052a38',
    TOKENDecimal: 18,
  });
  
  await checkPair({
    TOKENSymbol: 'CRV',
    TOKENAddress: '0xD533a949740bb3306d119CC777fa900bA034cd52',
    TOKENDecimal: 18
  });
} catch(error){
    console.error(error)
    monitoringPrice = false
    clearInterval(priceMonitor)
}
    monitoringPrice = false
    console.log('all pairs been checked...')
}
}


//checkAllPairs();

const POLLING_INTERVAL = 5000 // 5 Seconds
priceMonitor = setInterval(async () => { await checkAllPairs() }, POLLING_INTERVAL)
