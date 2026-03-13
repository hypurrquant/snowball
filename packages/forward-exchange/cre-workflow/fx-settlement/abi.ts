// Forward Exchange Contract ABIs for CRE Workflow
// ViewHelper for batch-reading matured positions, Consumer for DON report delivery

export const VIEW_HELPER_ABI = [
	{
		inputs: [{ internalType: 'address', name: 'forward', type: 'address' }],
		name: 'getMaturedPositions',
		outputs: [
			{
				components: [
					{ internalType: 'uint256', name: 'longId', type: 'uint256' },
					{ internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
					{ internalType: 'uint256', name: 'notional', type: 'uint256' },
					{ internalType: 'int256', name: 'forwardRate', type: 'int256' },
					{ internalType: 'address', name: 'longOwner', type: 'address' },
					{ internalType: 'address', name: 'shortOwner', type: 'address' },
				],
				internalType: 'struct ForwardViewHelper.MaturedPosition[]',
				name: 'positions',
				type: 'tuple[]',
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
