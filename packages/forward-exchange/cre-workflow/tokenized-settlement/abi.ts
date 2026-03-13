// Tokenized Forward AMM Contract ABIs for CRE Workflow

export const FACTORY_ABI = [
	{
		inputs: [],
		name: 'getActiveSeriesIds',
		outputs: [{ internalType: 'bytes32[]', name: '', type: 'bytes32[]' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'bytes32', name: 'seriesId', type: 'bytes32' }],
		name: 'getSeries',
		outputs: [
			{
				components: [
					{ internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
					{ internalType: 'uint256', name: 'maturityTime', type: 'uint256' },
					{ internalType: 'int256', name: 'forwardRate', type: 'int256' },
					{ internalType: 'address', name: 'fToken', type: 'address' },
					{ internalType: 'address', name: 'sfToken', type: 'address' },
					{ internalType: 'bool', name: 'settled', type: 'bool' },
				],
				internalType: 'struct IMaturityTokenFactory.Series',
				name: '',
				type: 'tuple',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
] as const

export const CONSUMER_ABI = [
	{
		inputs: [
			{ internalType: 'bytes', name: 'metadata', type: 'bytes' },
			{ internalType: 'bytes', name: 'report', type: 'bytes' },
		],
		name: 'onReport',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
] as const
