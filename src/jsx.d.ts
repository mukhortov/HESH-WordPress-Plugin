// JSX compiles to createElement() from @wordpress/element (see babel.config.js),
// and React 19's types no longer declare the global JSX namespace that needs.
import type { JSX as ReactJSX } from 'react';

declare global {
	namespace JSX {
		type ElementType = ReactJSX.ElementType;
		interface Element extends ReactJSX.Element {}
		interface ElementClass extends ReactJSX.ElementClass {}
		interface ElementAttributesProperty
			extends ReactJSX.ElementAttributesProperty {}
		interface ElementChildrenAttribute
			extends ReactJSX.ElementChildrenAttribute {}
		type LibraryManagedAttributes< C, P > =
			ReactJSX.LibraryManagedAttributes< C, P >;
		interface IntrinsicAttributes extends ReactJSX.IntrinsicAttributes {}
		interface IntrinsicClassAttributes<
			T,
		> extends ReactJSX.IntrinsicClassAttributes< T > {}
		interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
	}
}
