import nextConfig from 'eslint-config-next';

const config = [
	{
		ignores: [
			// Generated/cached runtime assets copied from node_modules for static hosting.
			'public/onnxruntime/**',
			'public/transformers/**',
		],
	},
	...nextConfig,
	{
		rules: {
			'react-hooks/immutability': 'off',
			'react-hooks/set-state-in-effect': 'off',
		},
	},
];

export default config;
