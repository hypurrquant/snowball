// Snowball Protocol — Liquity V2 ABIs
// Source: Liquity Bold fork (BUSL-1.1), rebranded as Snowball

export const BorrowerOperationsABI = [
  // Getters
  "function MCR() view returns (uint256)",
  "function CCR() view returns (uint256)",
  "function SCR() view returns (uint256)",
  "function addressesRegistry() view returns (address)",
  "function hasBeenShutDown() view returns (bool)",
  // Trove operations
  "function openTrove(address _owner, uint256 _ownerIndex, uint256 _ETHAmount, uint256 _boldAmount, uint256 _upperHint, uint256 _lowerHint, uint256 _annualInterestRate, uint256 _maxUpfrontFee, address _addManager, address _removeManager, address _receiver) returns (uint256)",
  "function closeTrove(uint256 _troveId)",
  "function adjustTrove(uint256 _troveId, uint256 _collChange, bool _isCollIncrease, uint256 _boldChange, bool _isDebtIncrease, uint256 _maxUpfrontFee)",
  "function adjustTroveInterestRate(uint256 _troveId, uint256 _newAnnualInterestRate, uint256 _upperHint, uint256 _lowerHint, uint256 _maxUpfrontFee)",
  "function addColl(uint256 _troveId, uint256 _ETHAmount)",
  "function withdrawColl(uint256 _troveId, uint256 _amount)",
  "function withdrawBold(uint256 _troveId, uint256 _amount, uint256 _maxUpfrontFee)",
  "function repayBold(uint256 _troveId, uint256 _amount)",
  "function applyPendingDebt(uint256 _troveId, uint256 _lowerHint, uint256 _upperHint)",
  "function claimCollateral()",
  "function shutdown()",
  "function shutdownFromOracleFailure()",
  // Batch management
  "function registerBatchManager(uint128 _minInterestRate, uint128 _maxInterestRate, uint128 _currentInterestRate, uint128 _annualManagementFee, uint128 _minInterestRateChangePeriod)",
  "function lowerBatchManagementFee(uint256 _newAnnualFee)",
  "function setBatchManagerAnnualInterestRate(uint128 _newAnnualInterestRate, uint256 _upperHint, uint256 _lowerHint, uint256 _maxUpfrontFee)",
  "function openTroveAndJoinInterestBatchManager(address _owner, uint256 _ownerIndex, uint256 _ETHAmount, uint256 _boldAmount, uint256 _upperHint, uint256 _lowerHint, address _interestBatchManagerAddress, uint256 _maxUpfrontFee, address _addManager, address _removeManager, address _receiver) returns (uint256)",
  "function setInterestBatchManager(uint256 _troveId, address _newBatchManagerAddress, uint256 _upperHint, uint256 _lowerHint, uint256 _maxUpfrontFee)",
  "function removeFromBatch(uint256 _troveId, uint256 _newAnnualInterestRate, uint256 _upperHint, uint256 _lowerHint, uint256 _maxUpfrontFee)",
  "function kickFromBatch(uint256 _troveId, uint256 _upperHint, uint256 _lowerHint)",
  "function switchBatchManager(uint256 _troveId, uint256 _removeUpperHint, uint256 _removeLowerHint, address _newBatchManagerAddress, uint256 _addUpperHint, uint256 _addLowerHint, uint256 _maxUpfrontFee)",
  "function checkBatchManagerExists(address _batchManager) view returns (bool)",
  "function interestBatchManagerOf(uint256 _troveId) view returns (address)",
  "function getInterestBatchManager(address _account) view returns (tuple(uint128 minInterestRate, uint128 maxInterestRate, uint128 currentInterestRate, uint256 debt, uint256 coll, uint256 annualManagementFee, uint256 minInterestRateChangePeriod, uint256 lastInterestRateAdjTime))",
  // Delegate management
  "function setInterestIndividualDelegate(uint256 _troveId, address _delegate, uint128 _minInterestRate, uint128 _maxInterestRate, uint256 _newAnnualInterestRate, uint256 _upperHint, uint256 _lowerHint, uint256 _maxUpfrontFee, uint256 _minInterestRateChangePeriod)",
  "function removeInterestIndividualDelegate(uint256 _troveId)",
  "function getInterestIndividualDelegateOf(uint256 _troveId) view returns (address delegate, uint128 minInterestRate, uint128 maxInterestRate, uint256 minInterestRateChangePeriod)",
  // Internal (called by TroveManager)
  "function onLiquidateTrove(uint256 _troveId)",
] as const;

export const TroveManagerABI = [
  // Getters
  "function MCR() view returns (uint256)",
  "function CCR() view returns (uint256)",
  "function shutdownTime() view returns (uint256)",
  "function lastZombieTroveId() view returns (uint256)",
  "function troveNFT() view returns (address)",
  "function stabilityPool() view returns (address)",
  "function sortedTroves() view returns (address)",
  "function borrowerOperations() view returns (address)",
  "function addressesRegistry() view returns (address)",
  // Trove queries
  "function getTroveIdsCount() view returns (uint256)",
  "function getTroveFromTroveIdsArray(uint256 _index) view returns (uint256)",
  "function getTroveStatus(uint256 _troveId) view returns (uint8)",
  "function getTroveAnnualInterestRate(uint256 _troveId) view returns (uint256)",
  "function getCurrentICR(uint256 _troveId, uint256 _price) view returns (uint256)",
  "function getLatestTroveData(uint256 _troveId) view returns (tuple(uint256 recordedDebt, uint256 annualInterestRate, uint256 weightedRecordedDebt, uint256 accruedInterest, uint256 redistDebtGain, uint256 accruedBatchManagementFee, uint256 lastInterestRateAdjTime))",
  "function getLatestBatchData(address _batchAddress) view returns (tuple(uint256 debt, uint256 coll, uint256 annualInterestRate, uint256 weightedRecordedDebt, uint256 annualManagementFee, uint256 weightedRecordedBatchManagementFee, uint256 accruedManagementFee, uint256 accruedInterest, uint256 entireDebtWithoutRedistribution))",
  // Liquidation
  "function batchLiquidateTroves(uint256[] calldata _troveArray)",
  // Redemption
  "function redeemCollateral(address _sender, uint256 _boldAmount, uint256 _price, uint256 _redemptionRate, uint256 _maxIterations) returns (uint256)",
  "function urgentRedemption(uint256 _sbUSDAmount, uint256[] calldata _troveIds, uint256 _minCollateral)",
  "function getUnbackedPortionPriceAndRedeemability() returns (uint256, uint256, bool)",
  // Shutdown
  "function shutdown()",
  // Events
  "event TroveUpdated(uint256 indexed troveId, uint256 debt, uint256 coll, uint256 stake, uint8 operation)",
  "event TroveLiquidated(uint256 indexed troveId, uint256 debt, uint256 coll, uint8 liquidationMode)",
  "event Redemption(uint256 attemptedBoldAmount, uint256 actualBoldAmount, uint256 ETHSent, uint256 ETHFee)",
] as const;

export const StabilityPoolABI = [
  "function sbUSDToken() view returns (address)",
  "function troveManager() view returns (address)",
  "function getTotalBoldDeposits() view returns (uint256)",
  "function getCollBalance() view returns (uint256)",
  "function getYieldGainsOwed() view returns (uint256)",
  "function getYieldGainsPending() view returns (uint256)",
  "function deposits(address _depositor) view returns (uint256 initialValue)",
  "function stashedColl(address _depositor) view returns (uint256)",
  "function getDepositorCollGain(address _depositor) view returns (uint256)",
  "function getDepositorYieldGain(address _depositor) view returns (uint256)",
  "function getDepositorYieldGainWithPending(address _depositor) view returns (uint256)",
  "function getCompoundedBoldDeposit(address _depositor) view returns (uint256)",
  "function P() view returns (uint256)",
  "function currentScale() view returns (uint256)",
  "function P_PRECISION() view returns (uint256)",
  "function scaleToS(uint256 _scale) view returns (uint256)",
  "function scaleToB(uint256 _scale) view returns (uint256)",
  "function provideToSP(uint256 _amount, bool _doClaim)",
  "function withdrawFromSP(uint256 _amount, bool _doClaim)",
  "function claimAllCollGains()",
  "function offset(uint256 _debt, uint256 _coll)",
  "event StabilityPoolETHBalanceUpdated(uint256 _newBalance)",
  "event StabilityPoolBoldBalanceUpdated(uint256 _newBalance)",
  "event UserDepositChanged(address indexed _depositor, uint256 _newDeposit)",
  "event ETHGainWithdrawn(address indexed _depositor, uint256 _ETH)",
  "event BoldGainWithdrawn(address indexed _depositor, uint256 _bold)",
] as const;

export const ActivePoolABI = [
  "function getCollBalance() view returns (uint256)",
  "function getBoldDebt() view returns (uint256)",
  "function aggWeightedDebtSum() view returns (uint256)",
  "function aggRecordedDebt() view returns (uint256)",
  "function calcPendingAggInterest() view returns (uint256)",
  "function lastAggUpdateTime() view returns (uint256)",
  "event EtherSent(address _to, uint256 _amount)",
  "event ActivePoolBoldDebtUpdated(uint256 _recordedDebtSum)",
] as const;

export const DefaultPoolABI = [
  "function getCollBalance() view returns (uint256)",
  "function getBoldDebt() view returns (uint256)",
  "event DefaultPoolETHBalanceUpdated(uint256 _ETH)",
  "event DefaultPoolBoldDebtUpdated(uint256 _BoldDebt)",
] as const;

export const CollSurplusPoolABI = [
  "function getCollateral(address _account) view returns (uint256)",
  "function claimColl(address _account)",
  "event CollBalanceUpdated(address indexed _account, uint256 _newBalance)",
  "event EtherSent(address _to, uint256 _amount)",
] as const;

export const CollateralRegistryABI = [
  "function baseRate() view returns (uint256)",
  "function lastFeeOperationTime() view returns (uint256)",
  "function totalCollaterals() view returns (uint256)",
  "function getToken(uint256 _index) view returns (address)",
  "function getTroveManager(uint256 _index) view returns (address)",
  "function sbUSDToken() view returns (address)",
  "function getRedemptionRate() view returns (uint256)",
  "function getRedemptionRateWithDecay() view returns (uint256)",
  "function getRedemptionRateForRedeemedAmount(uint256 _redeemAmount) view returns (uint256)",
  "function getRedemptionFeeWithDecay(uint256 _ETHDrawn) view returns (uint256)",
  "function getEffectiveRedemptionFeeInBold(uint256 _redeemAmount) view returns (uint256)",
  "function redeemCollateral(uint256 _boldAmount, uint256 _maxIterations, uint256 _maxFeePercentage)",
  "event Redemption(uint256 _attemptedBoldAmount, uint256 _actualBoldAmount, uint256 _collSent, uint256 _collFee)",
] as const;

export const TroveNFTABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function tokenURI(uint256 _tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address _owner) view returns (uint256)",
  "function ownerOf(uint256 _tokenId) view returns (address)",
  "function tokenOfOwnerByIndex(address _owner, uint256 _index) view returns (uint256)",
  "function safeTransferFrom(address,address,uint256)",
  "function transferFrom(address,address,uint256)",
  "function approve(address,uint256)",
  "function getApproved(uint256) view returns (address)",
  "function setApprovalForAll(address,bool)",
  "function isApprovedForAll(address,address) view returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
] as const;

export const SortedTrovesABI = [
  "function getSize() view returns (uint256)",
  "function getFirst() view returns (uint256)",
  "function getLast() view returns (uint256)",
  "function getNext(uint256 _id) view returns (uint256)",
  "function getPrev(uint256 _id) view returns (uint256)",
  "function contains(uint256 _id) view returns (bool)",
  "function findInsertPosition(uint256 _annualInterestRate, uint256 _prevId, uint256 _nextId) view returns (uint256, uint256)",
  "function validInsertPosition(uint256 _annualInterestRate, uint256 _prevId, uint256 _nextId) view returns (bool)",
] as const;

export const HintHelpersABI = [
  "function collateralRegistry() view returns (address)",
  "function getApproxHint(uint256 _collIndex, uint256 _interestRate, uint256 _numTrials, uint256 _inputRandomSeed) view returns (uint256 hintId, uint256 diff, uint256 latestRandomSeed)",
  "function predictOpenTroveUpfrontFee(uint256 _collIndex, uint256 _borrowedAmount, uint256 _interestRate) view returns (uint256)",
  "function predictAdjustInterestRateUpfrontFee(uint256 _collIndex, uint256 _troveId, uint256 _newInterestRate) view returns (uint256)",
  "function forcePredictAdjustInterestRateUpfrontFee(uint256 _collIndex, uint256 _troveId, uint256 _newInterestRate) view returns (uint256)",
  "function predictAdjustTroveUpfrontFee(uint256 _collIndex, uint256 _troveId, uint256 _debtIncrease) view returns (uint256)",
  "function predictAdjustBatchInterestRateUpfrontFee(uint256 _collIndex, address _batchAddress, uint256 _newInterestRate) view returns (uint256)",
  "function predictJoinBatchInterestRateUpfrontFee(uint256 _collIndex, uint256 _troveId, address _batchAddress) view returns (uint256)",
] as const;

export const MultiTroveGetterABI = [
  "function collateralRegistry() view returns (address)",
  "function getMultipleSortedTroves(uint256 _collIndex, int256 _startIdx, uint256 _count) view returns (tuple(uint256 id, uint256 debt, uint256 coll, uint256 stake, uint256 snapshotETH, uint256 snapshotBoldDebt)[])",
] as const;

export const AddressesRegistryABI = [
  "function MCR() view returns (uint256)",
  "function CCR() view returns (uint256)",
  "function borrowerOperations() view returns (address)",
  "function troveManager() view returns (address)",
  "function stabilityPool() view returns (address)",
  "function activePool() view returns (address)",
  "function defaultPool() view returns (address)",
  "function gasPool() view returns (address)",
  "function collSurplusPool() view returns (address)",
  "function sortedTroves() view returns (address)",
  "function troveNFT() view returns (address)",
  "function priceFeed() view returns (address)",
  "function sbUSDToken() view returns (address)",
  "function collToken() view returns (address)",
  "function setAddresses(address,address,address,address,address,address,address,address,address,address,address,address)",
] as const;

export const RedemptionHelperABI = [
  "function collateralRegistry() view returns (address)",
  "function simulateRedemption(uint256 _bold, uint256 _maxIterationsPerCollateral) view returns (tuple(uint256 collIndex, uint256 troveId, uint256 boldLot, uint256 collLot, uint256 appliedRedistBoldDebtGain)[])",
  "function truncateRedemption(uint256 _bold, uint256 _maxIterationsPerCollateral) view returns (uint256)",
  "function redeemCollateral(address _sender, uint256 _boldAmount, uint256 _maxIterations, uint256 _maxFeePercentage)",
] as const;

export const DebtInFrontHelperABI = [
  "function collateralRegistry() view returns (address)",
  "function hintHelpers() view returns (address)",
  "function getDebtBetweenInterestRates(uint256 _collIndex, uint256 _interestRateFrom, uint256 _interestRateTo) view returns (uint256)",
  "function getDebtBetweenInterestRateAndTrove(uint256 _collIndex, uint256 _interestRate, uint256 _troveId) view returns (uint256)",
] as const;
