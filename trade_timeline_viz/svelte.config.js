import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	compilerOptions: {
		runes: true
	},

	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false
		}),

		paths: {
            base: process.env.NODE_ENV === 'production' ? '/csci5609_trade-timeline-viz' : '',
        }
	}
};

export default config;
