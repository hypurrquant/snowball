import {
	bytesToHex,
	ConsensusAggregationByFields,
	type CronPayload,
	cre,
	encodeCallMsg,
	getNetwork,
	type HTTPSendRequester,
	hexToBase64,
	LAST_FINALIZED_BLOCK_NUMBER,
	median,
	Runner,
	type Runtime,
	TxStatus,
} from '@chainlink/cre-sdk'
import {
	type Address,
	decodeAbiParameters,
	encodeAbiParameters,
	encodeFunctionData,
	parseAbiParameters,
	zeroAddress,
} from 'viem'
import { z } from 'zod'
import { CONSUMER_ABI, VIEW_HELPER_ABI } from './abi'

// ─── Config Schema ───────────────────────────────────────────────────────────

const configSchema = z.object({
	schedule: z.string(),
	fxApiUrl: z.string(),
	samsungApiUrl: z.string().default('https://query1.finance.yahoo.com/v8/finance/chart/005930.KS?interval=1d&range=1d'),
	googleApiUrl: z.string().default('https://query1.finance.yahoo.com/v8/finance/chart/GOOGL?interval=1d&range=1d'),
	evms: z.array(
		z.object({
			forwardAddress: z.string(),
			consumerAddress: z.string(),
			viewHelperAddress: z.string(),
			chainSelectorName: z.string(),
			gasLimit: z.string(),
		}),
	),
})

type Config = z.infer<typeof configSchema>

// ─── FX Data Types ───────────────────────────────────────────────────────────

interface FXRates {
	KRW: number
	JPY: number
	EUR: number
	SAMSUNG: number
	GOOGLE: number
}

interface MaturedPosition {
	longId: bigint
	marketId: `0x${string}`
	notional: bigint
	forwardRate: bigint
	longOwner: Address
	shortOwner: Address
}

// ─── Constants ───────────────────────────────────────────────────────────────

// keccak256("USD/KRW"), keccak256("USD/JPY"), keccak256("EUR/USD"), keccak256("SAMSUNG/USD"), keccak256("GOOGLE/USD")
const USD_KRW_MARKET = '0x45c5ae8ce2fdd70d24d0133747983d5ed2e0bc1e40042884ff8e1c4ac7aea89e'
const USD_JPY_MARKET = '0x35b8bafff3570683af968b8d36b91b1a19465141d9712425e9f76c68ff8cb152'
const EUR_USD_MARKET = '0xa9226449042e36bf6865099eec57482aa55e3ad026c315a0e4a692b776c318ca'
const SAMSUNG_USD_MARKET = '0xacea33319dac8d0d8b17aca2bcd09ea3db02e5a901eb88121659dc7c71b3c624'
const GOOGLE_USD_MARKET = '0xc07d5ee9809480c91393603b9d8013c706b835ead78955642eabafd645a4a32e'

// ─── FX Data Fetching ────────────────────────────────────────────────────────

const fetchFXRates = (sendRequester: HTTPSendRequester, config: Config): FXRates => {
	const response = sendRequester.sendRequest({
		url: config.fxApiUrl,
		method: 'GET',
	}).result()

	if (response.statusCode !== 200) {
		throw new Error(`FX API request failed with status: ${response.statusCode}`)
	}

	const responseText = Buffer.from(response.body).toString('utf-8')
	const data = JSON.parse(responseText)

	// Fetch Samsung stock price from Yahoo Finance (KRW denominated → convert to USD)
	let samsungUsd = 0
	try {
		const stockResponse = sendRequester.sendRequest({
			url: config.samsungApiUrl,
			method: 'GET',
			headers: { 'User-Agent': 'CRE-Workflow/1.0' },
		}).result()

		if (stockResponse.statusCode === 200) {
			const stockText = Buffer.from(stockResponse.body).toString('utf-8')
			const stockData = JSON.parse(stockText)
			const priceKrw = stockData.chart?.result?.[0]?.meta?.regularMarketPrice ?? 0
			// Convert KRW price to USD using the FX rate
			if (priceKrw > 0 && data.rates.KRW > 0) {
				samsungUsd = priceKrw / data.rates.KRW
			}
		}
	} catch {
		// If stock API fails, leave as 0 — positions with this market will be skipped
	}

	// Fetch Google stock price from Yahoo Finance (USD denominated)
	let googleUsd = 0
	try {
		const googleResponse = sendRequester.sendRequest({
			url: config.googleApiUrl,
			method: 'GET',
			headers: { 'User-Agent': 'CRE-Workflow/1.0' },
		}).result()

		if (googleResponse.statusCode === 200) {
			const googleText = Buffer.from(googleResponse.body).toString('utf-8')
			const googleData = JSON.parse(googleText)
			googleUsd = googleData.chart?.result?.[0]?.meta?.regularMarketPrice ?? 0
		}
	} catch {
		// If stock API fails, leave as 0 — positions with this market will be skipped
	}

	return {
		KRW: data.rates.KRW,
		JPY: data.rates.JPY,
		EUR: data.rates.EUR,
		SAMSUNG: samsungUsd,
		GOOGLE: googleUsd,
	}
}

// ─── PnL Calculation (matches Solidity SettlementEngine.calculatePnL) ────────

function calculatePnL(notional: bigint, forwardRate: bigint, settlementRate: bigint): bigint {
	const rateDiff = settlementRate - forwardRate
	return (notional * rateDiff) / settlementRate
}

// ─── Main Workflow Handler ───────────────────────────────────────────────────

const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): object => {
	if (!payload.scheduledExecutionTime) {
		throw new Error('Scheduled execution time is required')
	}

	const evmConfig = runtime.config.evms[0]

	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found: ${evmConfig.chainSelectorName}`)
	}

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

	// Step 1: Batch-read all matured positions via ViewHelper (1 chain read)
	runtime.log('Fetching matured positions via ForwardViewHelper...')

	const helperCallData = encodeFunctionData({
		abi: VIEW_HELPER_ABI,
		functionName: 'getMaturedPositions',
		args: [evmConfig.forwardAddress as Address],
	})

	const helperResult = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: evmConfig.viewHelperAddress as Address,
				data: helperCallData,
			}),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	const resultHex = bytesToHex(helperResult.data)
	if (resultHex === '0x' || resultHex.length < 4) {
		runtime.log('ViewHelper returned empty data. Skipping.')
		return { settled: 0, status: 'no_data' }
	}

	// Decode the array of MaturedPosition structs
	const decoded = decodeAbiParameters(
		[{
			type: 'tuple[]',
			components: [
				{ name: 'longId', type: 'uint256' },
				{ name: 'marketId', type: 'bytes32' },
				{ name: 'notional', type: 'uint256' },
				{ name: 'forwardRate', type: 'int256' },
				{ name: 'longOwner', type: 'address' },
				{ name: 'shortOwner', type: 'address' },
			],
		}],
		resultHex as `0x${string}`,
	)

	const positions = decoded[0] as unknown as MaturedPosition[]

	runtime.log(`Found ${positions.length} matured positions`)

	if (positions.length === 0) {
		return { settled: 0 }
	}

	// Step 2: Fetch FX rates with DON consensus (median aggregation)
	runtime.log('Fetching FX rates from Frankfurter API with DON consensus...')

	const httpCapability = new cre.capabilities.HTTPClient()
	const fxRates = httpCapability
		.sendRequest(
			runtime,
			fetchFXRates,
			ConsensusAggregationByFields<FXRates>({
				KRW: median,
				JPY: median,
				EUR: median,
				SAMSUNG: median,
				GOOGLE: median,
			}),
		)(runtime.config)
		.result()

	runtime.log(`FX Rates - USD/KRW: ${fxRates.KRW}, USD/JPY: ${fxRates.JPY}, EUR/USD: ${(1 / fxRates.EUR).toFixed(4)}, SAMSUNG/USD: ${fxRates.SAMSUNG.toFixed(2)}, GOOGLE/USD: ${fxRates.GOOGLE.toFixed(2)}`)

	const krwRate = BigInt(Math.round(fxRates.KRW * 1e18))
	const jpyRate = BigInt(Math.round(fxRates.JPY * 1e18))
	const eurUsdRate = BigInt(Math.round((1 / fxRates.EUR) * 1e18))
	const samsungRate = BigInt(Math.round(fxRates.SAMSUNG * 1e18))
	const googleRate = BigInt(Math.round(fxRates.GOOGLE * 1e18))

	let settledCount = 0

	// Market ID → human-readable name
	const MARKET_NAMES: Record<string, string> = {
		[USD_KRW_MARKET]: 'USD/KRW',
		[USD_JPY_MARKET]: 'USD/JPY',
		[EUR_USD_MARKET]: 'EUR/USD',
		[SAMSUNG_USD_MARKET]: 'SAMSUNG/USD',
		[GOOGLE_USD_MARKET]: 'GOOGLE/USD',
	}

	// Step 3: Process each matured position (no additional chain reads needed!)
	for (const pos of positions) {
		const marketName = MARKET_NAMES[pos.marketId] ?? 'UNKNOWN'

		// Determine settlement rate based on market
		let settlementRate: bigint
		if (pos.marketId === USD_KRW_MARKET) {
			settlementRate = krwRate
		} else if (pos.marketId === USD_JPY_MARKET) {
			settlementRate = jpyRate
		} else if (pos.marketId === EUR_USD_MARKET) {
			settlementRate = eurUsdRate
		} else if (pos.marketId === SAMSUNG_USD_MARKET) {
			if (samsungRate === 0n) {
				runtime.log(`[${marketName}] Position ${pos.longId.toString()}: price unavailable, skipping`)
				continue
			}
			settlementRate = samsungRate
		} else if (pos.marketId === GOOGLE_USD_MARKET) {
			if (googleRate === 0n) {
				runtime.log(`[${marketName}] Position ${pos.longId.toString()}: price unavailable, skipping`)
				continue
			}
			settlementRate = googleRate
		} else {
			runtime.log(`[${marketName}] Position ${pos.longId.toString()}: unknown market, skipping`)
			continue
		}

		// Calculate PnL
		const pnl = calculatePnL(pos.notional, pos.forwardRate, settlementRate)

		// Determine winner/loser
		const winner = pnl >= 0n ? pos.longOwner : pos.shortOwner
		const loser = pnl >= 0n ? pos.shortOwner : pos.longOwner

		runtime.log(
			`[${marketName}] Position #${pos.longId.toString()}: rate=${settlementRate.toString()}, PnL=${pnl.toString()}, Winner=${winner}`,
		)

		// Encode settlement report
		const reportData = encodeAbiParameters(
			parseAbiParameters(
				'uint256 positionId, int256 settlementRate, int256 pnl, address winner, address loser',
			),
			[pos.longId, settlementRate, pnl, winner, loser],
		)

		const writeCallData = encodeFunctionData({
			abi: CONSUMER_ABI,
			functionName: 'onReport',
			args: [`0x`, reportData],
		})

		// Generate DON-signed report and write on-chain
		const report = runtime
			.report({
				encodedPayload: hexToBase64(writeCallData),
				encoderName: 'evm',
				signingAlgo: 'ecdsa',
				hashingAlgo: 'keccak256',
			})
			.result()

		const writeResult = evmClient
			.writeReport(runtime, {
				receiver: evmConfig.consumerAddress,
				report,
				gasConfig: {
					gasLimit: evmConfig.gasLimit,
				},
			})
			.result()

		if (writeResult.txStatus !== TxStatus.SUCCESS) {
			runtime.log(
				`[${marketName}] Position #${pos.longId.toString()}: FAILED — ${writeResult.errorMessage || writeResult.txStatus}`,
			)
			continue
		}

		runtime.log(
			`[${marketName}] Position #${pos.longId.toString()}: SETTLED ✓ TX: ${bytesToHex(writeResult.txHash || new Uint8Array(32))}`,
		)
		settledCount++
	}

	runtime.log(`Settlement run complete. Settled ${settledCount} positions.`)
	return { settled: settledCount }
}

// ─── Workflow Init ───────────────────────────────────────────────────────────

const initWorkflow = (config: Config) => {
	const cronTrigger = new cre.capabilities.CronCapability()

	return [
		cre.handler(
			cronTrigger.trigger({ schedule: config.schedule }),
			onCronTrigger,
		),
	]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })
	await runner.run(initWorkflow)
}

main()
