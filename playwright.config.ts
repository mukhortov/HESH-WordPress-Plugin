import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests against WordPress Playground sites running the packaged
 * plugin (`npm run package` first). HESH_E2E_SITES picks the sites, for
 * example `HESH_E2E_SITES=6.5`.
 */
const allSites = [
	{ wp: '6.5', php: '7.4', port: 9401 },
	{ wp: 'latest', php: '8.3', port: 9402 },
];
const only = process.env.HESH_E2E_SITES?.split( ',' );
const sites = only ? allSites.filter( ( site ) => only.includes( site.wp ) ) : allSites;

export default defineConfig( {
	testDir: 'tests/e2e',
	timeout: 90_000,
	expect: { timeout: 15_000 },
	// the tests of one site share its user settings
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [ [ 'github' ], [ 'list' ] ] : 'list',
	use: {
		trace: 'retain-on-failure',
		viewport: { width: 1400, height: 1000 },
	},
	projects: sites.map( ( site ) => ( {
		name: `wp-${ site.wp }`,
		use: { baseURL: `http://127.0.0.1:${ site.port }` },
	} ) ),
	webServer: sites.map( ( site ) => ( {
		command: `node tests/e2e/server.mjs ${ site.wp } ${ site.php } ${ site.port }`,
		url: `http://127.0.0.1:${ site.port }/wp-login.php`,
		timeout: 300_000,
		reuseExistingServer: ! process.env.CI,
	} ) ),
} );
