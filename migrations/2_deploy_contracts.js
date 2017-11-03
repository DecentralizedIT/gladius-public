
Date.prototype.getUnixTime = function() { 
  return this.getTime()/1000|0;
};

var web3 = require('web3')
var time = require('../test/lib/time.js')

// Contracts
var Whitelist = artifacts.require("Whitelist")
var TokenContract = artifacts.require("GLAToken")
var CrowdsaleContract = artifacts.require("GLACrowdsale")

// Testing
var PresaleCrowdsale = artifacts.require("MockCrowdsale")
var PresaleToken = artifacts.require("MockToken")

var whitelistAddress
var presaleCrowdsaleAddress
var presaleTokenAddress
var tokenInstance
var tokenDenominator
var crowdsaleInstance
var stakeholders
var start 
var rates

var baseRate = 500
var percentageDenominator = 10000 // 4 decimals

var minAmount = web3.utils.toWei(2000, 'ether')
var maxAmount = web3.utils.toWei(86206, 'ether') // 25 mln USD
var minAcceptedAmount = web3.utils.toWei(40, 'finney')
var minAmountPresale = web3.utils.toWei(1000, 'ether')
var maxAmountPresale = web3.utils.toWei(72413, 'ether') // 21 mln USD
var minAcceptedAmountPresale = web3.utils.toWei(1, 'ether')

var phases = [{
  period: 'Presale',
  duration: 68 * time.days,
  rate: 500,
  lockupPeriod: 30 * time.days,
  usesVolumeMultiplier: true
}, {
  period: 'First 24 hours',
  duration: 1 * time.days,
  rate: 600,
  lockupPeriod: 0,
  usesVolumeMultiplier: false
}, {
  period: 'First week',
  duration: 7 * time.days,
  rate: 525,
  lockupPeriod: 0,
  usesVolumeMultiplier: false
}, {
  period: 'Second week',
  duration: 7 * time.days,
  rate: 515,
  lockupPeriod: 0,
  usesVolumeMultiplier: false
}, {
  period: 'Third week',
  duration: 7 * time.days,
  rate: 505,
  lockupPeriod: 0,
  usesVolumeMultiplier: false
}, {
  period: 'Last week',
  duration: 7 * time.days,
  rate: 500,
  lockupPeriod: 0,
  usesVolumeMultiplier: false
}]

var volumeMultipliers = [{
  rate: 2000, // 1:600
  lockupPeriod: 0,
  threshold: web3.utils.toWei(1, 'ether')
}, {
  rate: 2500, // 1:625
  lockupPeriod: 0,
  threshold: web3.utils.toWei(17, 'ether')
}, {
  rate: 3000, // 1:650
  lockupPeriod: 0,
  threshold: web3.utils.toWei(34, 'ether')
}, {
  rate: 3500, // 1:675
  lockupPeriod: 5000,
  threshold: web3.utils.toWei(103, 'ether')
}, {
  rate: 4000, // 1:700
  lockupPeriod: 10000,
  threshold: web3.utils.toWei(344, 'ether')
}, {
  rate: 4500, // 1:725
  lockupPeriod: 15000,
  threshold: web3.utils.toWei(689, 'ether')
}, {
  rate: 5000, // 1:750
  lockupPeriod: 20000,
  threshold: web3.utils.toWei(1724, 'ether')
}]

var stakeholderTokenReleasePhases = [{
  percentage: 2500,
  vestingPeriod: 90 * time.days
}, {
  percentage: 2500,
  vestingPeriod: 180 * time.days
}, {
  percentage: 2500,
  vestingPeriod: 270 * time.days
}, {
  percentage: 2500,
  vestingPeriod: 360 * time.days
}]

var isTestingNetwork = function (network) {
  return network == 'test' || network == 'develop' || network == 'development'
}

var preDeploy = () => Promise.resolve()
var deployTestArtifacts = function (deployer, network, accounts) {
  return deployer.deploy(Whitelist).then(function () {
    return Whitelist.deployed()
  })
  .then(function (_instance) {
    whitelistAddress = _instance.address
    return deployer.deploy(PresaleToken, "Gladius preslale token", "GLA", true)
  })
  .then(function () {
    return PresaleToken.deployed()
  })
  .then(function (_instance) {
    presaleTokenAddress = _instance.address
    return deployer.deploy(PresaleCrowdsale)
  })
  .then(function () {
    return PresaleCrowdsale.deployed()
  })
  .then(function (_instance) {
    presaleCrowdsaleAddress = _instance.address
    return Promise.resolve()
  })
}

module.exports = function(deployer, network, accounts) {
  if (isTestingNetwork(network)) {
    preDeploy = function () {
      return deployTestArtifacts(deployer, network, accounts)
    }

    start = new Date("November 7, 2017 12:00:00 GMT+0000").getUnixTime()
    stakeholders = [{
      account: accounts[0], // Beneficiary 
      tokens: 0,
      eth: 8000,
      overwriteReleaseDate: false,
      fixedReleaseDate: 0
    }, {
      account: accounts[3], // Core founders
      tokens: 1000,
      eth: 0,
      overwriteReleaseDate: true,
      fixedReleaseDate: new Date("June 7, 2019 12:00:00 GMT+0000").getUnixTime()
    }, {
      account: accounts[4], // Decentralized
      tokens: 750,
      eth: 1000,
      overwriteReleaseDate: false,
      fixedReleaseDate: 0
    }, {
      account: accounts[5], // Inbound
      tokens: 750,
      eth: 1000,
      overwriteReleaseDate: false,
      fixedReleaseDate: 0
    }, {
      account: accounts[6], // Bounty
      tokens: 1300,
      eth: 0,
      overwriteReleaseDate: false,
      fixedReleaseDate: 0
    }, {
      account: accounts[1], // Wings.ai community
      tokens: 200,
      eth: 0,
      overwriteReleaseDate: true,
      fixedReleaseDate: 0
    }]
  } else if(network == "main") {
    start = new Date("November 7, 2017 12:00:00 GMT+0000").getUnixTime()
    whitelistAddress = '0x1a0987A5c068EC6ce645bB897d8DE4c82281deAe' // Existing whitelist
    presaleCrowdsaleAddress = '0x57BFfFD48366F78e787e167419C8c05CDb849EdE' // Existing presale
    presaleTokenAddress = '0x4632d1c31c5d9e28e84eae0173b3afc9aca81ac8' // Existing token
    stakeholders = [{
      account: '0x38fE864dCB9CB039C7f3d0Adc0a7EfeB9C864cd9', // Beneficiary 
      tokens: 0,
      eth: 8000,
      overwriteReleaseDate: false,
      fixedReleaseDate: 0
    }, {
      account: '0xC19Fd2748a4D5d7906A3Fb731fF6186FE526cC28', // Core founders
      tokens: 1000,
      eth: 0,
      overwriteReleaseDate: true,
      fixedReleaseDate: new Date("June 7, 2019 12:00:00 GMT+0000").getUnixTime()
    }, {
      account: '0x197f48540296B76caBe1B7C27f35767338084E03', // Decentralized
      tokens: 750,
      eth: 1000,
      overwriteReleaseDate: false,
      fixedReleaseDate: 0
    }, {
      account: '0x201f2129BF943Ff4b0042ec05F123F6C8C52637C', // Inbound
      tokens: 750,
      eth: 1000,
      overwriteReleaseDate: false,
      fixedReleaseDate: 0
    }, {
      account: '0xA88b950589Ac78ec10eDEfb0b40563400f3aF13E', // Bounty
      tokens: 1300,
      eth: 0,
      overwriteReleaseDate: false,
      fixedReleaseDate: 0
    }, {
      account: '0x5462b7a6d06182E5e0Db22552Dd48b29eDa5BAF3', // Wings.ai community
      tokens: 200,
      eth: 0,
      overwriteReleaseDate: true,
      fixedReleaseDate: 0
    }]
  }

  return preDeploy().then(function() {
    return deployer.deploy(TokenContract)
  }).then(function(){
    return TokenContract.deployed()
  })
  .then(function(_instance){
    tokenInstance = _instance
    return tokenInstance.decimals.call()
  })
  .then(function(_decimals){
    tokenDenominator = Math.pow(10, _decimals.toNumber())
    return deployer.deploy(CrowdsaleContract)
  })
  .then(function () {
    return CrowdsaleContract.deployed()
  })
  .then(function(_instance){
    crowdsaleInstance = _instance
    return crowdsaleInstance.setup(
      start,
      tokenInstance.address,
      tokenDenominator,
      percentageDenominator,
      minAmount,
      maxAmount,
      minAcceptedAmount,
      minAmountPresale,
      maxAmountPresale,
      minAcceptedAmountPresale)
  })
  .then(function(){
    return crowdsaleInstance.setupPhases(
      baseRate,
      Array.from(phases, val => val.rate), 
      Array.from(phases, val => val.duration), 
      Array.from(phases, val => val.lockupPeriod),
      Array.from(phases, val => val.usesVolumeMultiplier))
  })
  .then(function(){
    return crowdsaleInstance.setupStakeholders(
      Array.from(stakeholders, val => val.account), 
      Array.from(stakeholders, val => val.eth), 
      Array.from(stakeholders, val => val.tokens),
      Array.from(stakeholders, val => val.overwriteReleaseDate),
      Array.from(stakeholders, val => val.fixedReleaseDate),
      Array.from(stakeholderTokenReleasePhases, val => val.percentage),
      Array.from(stakeholderTokenReleasePhases, val => val.vestingPeriod))
  })
  .then(function(){
    return crowdsaleInstance.setupVolumeMultipliers(
      Array.from(volumeMultipliers, val => val.rate), 
      Array.from(volumeMultipliers, val => val.lockupPeriod), 
      Array.from(volumeMultipliers, val => val.threshold))
  })
  .then(function(){
    return crowdsaleInstance.setupWhitelist(whitelistAddress)
  })
  .then(function(){
    return crowdsaleInstance.attachPresale(
      presaleCrowdsaleAddress, presaleTokenAddress)
  })
  .then(function(){
    return crowdsaleInstance.deploy()
  })
  .then(function(){
    return tokenInstance.transferOwnership(crowdsaleInstance.address)
  })
}
