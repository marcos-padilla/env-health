import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default [
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	prettier,
	{
		ignores: ['dist/**'],
	},
	{
		files: ['*.cjs', '*.mjs'],
		languageOptions: {
			globals: {
				module: 'readonly',
				require: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly',
				exports: 'readonly',
				process: 'readonly',
			},
		},
	},
]
