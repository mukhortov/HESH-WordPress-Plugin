import { describe, expect, it, vi } from 'vitest';
import { once, themes } from './index';

describe( 'themes', () => {
	it( 'makes the themes with their own settings once', async () => {
		// each one made would add another copy of its styles to the page
		for ( const id of [ 'eclipse', 'solarized-dark' ] as const ) {
			expect( await themes[ id ].load() ).toBe(
				await themes[ id ].load()
			);
		}
	} );

	it( 'tries a theme that failed to load again', async () => {
		const theme = { theme: true };
		const make = vi
			.fn()
			.mockRejectedValueOnce( new Error( 'chunk failed' ) )
			.mockResolvedValue( theme );
		const load = once( make );
		await expect( load() ).rejects.toThrow( 'chunk failed' );
		expect( await load() ).toBe( theme );
		expect( await load() ).toBe( theme );
		expect( make ).toHaveBeenCalledTimes( 2 );
	} );
} );
