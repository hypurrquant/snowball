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
	decodeFunctionResult,
	encodeAbiParameters,
	encodeFunctionData,
	parseAbiParameters,
	zeroAddress,
} from 'viem'
import { z } from 'zod'
import { FACTORY_ABI, CONSUMER_ABI } from './abi'

// ─── Config Schema ───────────────────────────────────────────────────────────

const configSchema = z.object({
	schedule: z.string(),
	fxApiUrl: z.string(),
	samsungApiUrl: z.string().default('https://query1.finance.yahoo.com/v8/finance/chart/005930.KS?interval=1d&range=1d'),
	googleApiUrl: z.string().default('https://query1.finance.yahoo.com/v8/finance/chart/GOOGL?interval=1d&range=1d'),
	evms: z.array(
		z.object({
			factoryAddress: z.string(),
			consumerAddress: z.string(),
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

interface Series {
	marketId: `0x${string}`
	maturityTime: bigint
	forwardRate: bigint
	fToken: Address
	sfToken: Address
	settled: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

// keccak256("USD/KRW"), keccak256("USD/JPY"), keccak256("EUR/USD"), keccak256("SAMSUNG/USD"), keccak256("GOOGLE/USD")
const USD_KRW_MARKET = '0x045c5ae8ce2fdd70d24d0133747983d5ed2e0bc1e40042884ff8e1c4ac7aea89e'
const USD_JPY_MARKET = '0x035b8bafff3570683af968b8d36b91b1a19465141d9712425e9f76c68ff8cb152'
const EUR_USD_MARKET = '0x0a9226449042e36bf6865099eec57482aa55e3ad026c315a0e4a692b776c318ca'
const SAMSUNG_USD_MARKET = '0x0acea33319dac8d0d8b17aca2bcd09ea3db02e5a901eb88121659dc7c71b3c624'
const GOOGLE_USD_MARKET = '0x0c07d5ee9809480c91393603b9d8013c706b835ead78955642eabafd645a4a32e'

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

	// Reject stale prices: Frankfurter includes a `date` field (YYYY-MM-DD)
	if (data.date) {
		const priceDate = new Date(data.date).getTime()
		const twoDaysMs = 2 * 24 * 60 * 60 * 1000
		if (Date.now() - priceDate > twoDaysMs) {
			throw new Error(`FX price data is stale: date=${data.date}`)
		}
	}

	// Fetch Samsung stock price (KRW → USD conversion)
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
			if (priceKrw > 0 && data.rates.KRW > 0) {
				samsungUsd = priceKrw / data.rates.KRW
			}
		}
	} catch {
		// If stock API fails, leave as 0 — series with this market will be skipped
	}

	// Fetch Google stock price (USD)
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
		// If stock API fails, leave as 0 — series with this market will be skipped
	}

	return {
		KRW: data.rates.KRW,
		JPY: data.rates.JPY,
		EUR: data.rates.EUR,
		SAMSUNG: samsungUsd,
		GOOGLE: googleUsd,
	}
}

// ─── Main Workflow Handler ───────────────────────────────────────────────────

const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): object => {
	if (!payload.scheduledExecutionTime) {
		throw new Error('Scheduled execution time is required')
	}

	// Step 1: Fetch FX rates with DON consensus (median aggregation) — shared across all chains
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

	// Convert rates to 18 decimal format (string-based to avoid float precision loss for large values)
	const scaleToWei = (value: number): bigint => {
		const str = value.toString()
		const [whole, frac = ''] = str.split('.')
		return BigInt(whole + frac.padEnd(18, '0').slice(0, 18))
	}
	const krwRate = scaleToWei(fxRates.KRW)
	const jpyRate = scaleToWei(fxRates.JPY)
	const eurUsdRate = scaleToWei(1 / fxRates.EUR)
	const samsungRate = scaleToWei(fxRates.SAMSUNG)
	const googleRate = scaleToWei(fxRates.GOOGLE)

	// Market ID → human-readable name
	const MARKET_NAMES: Record<string, string> = {
		[USD_KRW_MARKET]: 'USD/KRW',
		[USD_JPY_MARKET]: 'USD/JPY',
		[EUR_USD_MARKET]: 'EUR/USD',
		[SAMSUNG_USD_MARKET]: 'SAMSUNG/USD',
		[GOOGLE_USD_MARKET]: 'GOOGLE/USD',
	}

	let settledCount = 0

	for (const evmConfig of runtime.config.evms) {
		const network = getNetwork({
			chainFamily: 'evm',
			chainSelectorName: evmConfig.chainSelectorName,
			isTestnet: true,
		})

		if (!network) {
			runtime.log(`Network not found: ${evmConfig.chainSelectorName}, skipping`)
			continue
		}

		const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

		// Step 2: Get active (unsettled) series IDs
		runtime.log(`[${evmConfig.chainSelectorName}] Fetching active series from MaturityTokenFactory...`)

		const activeSeriesData = encodeFunctionData({
			abi: FACTORY_ABI,
			functionName: 'getActiveSeriesIds',
		})

		const activeSeriesResult = evmClient
			.callContract(runtime, {
				call: encodeCallMsg({
					from: zeroAddress,
					to: evmConfig.factoryAddress as Address,
					data: activeSeriesData,
				}),
				blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
			})
			.result()

		const resultHex = bytesToHex(activeSeriesResult.data)
		if (resultHex === '0x' || resultHex.length < 4) {
			runtime.log(`[${evmConfig.chainSelectorName}] Factory contract not deployed or returned empty data. Skipping.`)
			continue
		}

		const activeSeriesIds = decodeFunctionResult({
			abi: FACTORY_ABI,
			functionName: 'getActiveSeriesIds',
			data: resultHex,
		}) as `0x${string}`[]

		runtime.log(`[${evmConfig.chainSelectorName}] Found ${activeSeriesIds.length} active series`)

		// Step 3: Check each active series
		for (const seriesId of activeSeriesIds) {
			const seriesCallData = encodeFunctionData({
				abi: FACTORY_ABI,
				functionName: 'getSeries',
				args: [seriesId],
			})

			const seriesResult = evmClient
				.callContract(runtime, {
					call: encodeCallMsg({
						from: zeroAddress,
						to: evmConfig.factoryAddress as Address,
						data: seriesCallData,
					}),
					blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
				})
				.result()

			const series = decodeFunctionResult({
				abi: FACTORY_ABI,
				functionName: 'getSeries',
				data: bytesToHex(seriesResult.data),
			}) as unknown as Series

			const marketName = MARKET_NAMES[series.marketId] ?? 'UNKNOWN'

			// Skip if already settled
			if (series.settled) {
				runtime.log(`[${marketName}] Series ${seriesId}: already settled, skipping`)
				continue
			}

			// Skip if not yet matured
			if (BigInt(Math.floor(Date.now() / 1000)) < series.maturityTime) {
				runtime.log(`[${marketName}] Series ${seriesId}: not yet matured, skipping`)
				continue
			}

			// Determine settlement rate based on market
			let settlementRate: bigint
			if (series.marketId === USD_KRW_MARKET) {
				settlementRate = krwRate
			} else if (series.marketId === USD_JPY_MARKET) {
				settlementRate = jpyRate
			} else if (series.marketId === EUR_USD_MARKET) {
				settlementRate = eurUsdRate
			} else if (series.marketId === SAMSUNG_USD_MARKET) {
				if (samsungRate === 0n) {
					runtime.log(`[${marketName}] Series ${seriesId}: price unavailable, skipping`)
					continue
				}
				settlementRate = samsungRate
			} else if (series.marketId === GOOGLE_USD_MARKET) {
				if (googleRate === 0n) {
					runtime.log(`[${marketName}] Series ${seriesId}: price unavailable, skipping`)
					continue
				}
				settlementRate = googleRate
			} else {
				runtime.log(`[${marketName}] Series ${seriesId}: unknown market, skipping`)
				continue
			}

			runtime.log(`[${marketName}] Series ${seriesId}: settling at rate ${settlementRate.toString()}`)

			// Step 4: Encode settlement report (seriesId, settlementRate)
			const reportData = encodeAbiParameters(
				parseAbiParameters('bytes32 seriesId, int256 settlementRate'),
				[seriesId as `0x${string}`, settlementRate],
			)

			const writeCallData = encodeFunctionData({
				abi: CONSUMER_ABI,
				functionName: 'onReport',
				args: [`0x`, reportData],
			})

			// Step 5: Generate DON-signed report and write on-chain
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
					`[${marketName}] Series ${seriesId}: FAILED — ${writeResult.errorMessage || writeResult.txStatus}`,
				)
				continue
			}

			runtime.log(
				`[${marketName}] Series ${seriesId}: SETTLED ✓ TX: ${bytesToHex(writeResult.txHash || new Uint8Array(32))}`,
			)
			settledCount++
		}
	}

	runtime.log(`Settlement run complete. Settled ${settledCount} series.`)
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
