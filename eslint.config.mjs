import nextConfig from 'eslint-config-next';

export default [
	...nextConfig,
	{
		rules: {
			'react-hooks/immutability': 'off',
			'react-hooks/set-state-in-effect': 'off',
		},
	},
];
