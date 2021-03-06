/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {isPromise} from '../src/util/lang';

import {Inject, Injectable, InjectionToken, Optional} from './di';


/**
 * An injection token that allows you to provide one or more initialization functions.
 * These function are injected at application startup and executed during
 * app initialization. If any of these functions returns a Promise, initialization
 * does not complete until the Promise is resolved.
 *
 * You can, for example, create a factory function that loads language data
 * or an external configuration, and provide that function to the `APP_INITIALIZER` token.
 * That way, the function is executed during the application bootstrap process,
 * and the needed data is available on startup.
 *
 * @publicApi
 */
export const APP_INITIALIZER = new InjectionToken<Array<() => void>>('Application Initializer');

/**
 * A class that reflects the state of running {@link APP_INITIALIZER}s.
 *
 * @publicApi
 */
@Injectable()
export class ApplicationInitStatus {
	// TODO(issue/24571): remove '!'.
	private resolve!: Function;
	// TODO(issue/24571): remove '!'.
	private reject!: Function;
	private initialized = false;
	public readonly donePromise: Promise<any>;
	public readonly done = false;

	constructor(@Inject(APP_INITIALIZER) @Optional() private appInits: (() => any)[]) {
		this.donePromise = new Promise((res, rej) => {
			this.resolve = res;
			this.reject = rej;
		});
	}

	/** @internal */
	runInitializers() {
		if (this.initialized) {
			return;
		}

		const asyncInitPromises: Promise<any>[] = [];

		const complete = () => {
			(this as {done: boolean}).done = true;
			this.resolve();
		};

		if (this.appInits) {
			for (let i = 0; i < this.appInits.length; i++) {
				const initResult = this.appInits[i]();
				if (isPromise(initResult)) {
					asyncInitPromises.push(initResult);
				}
			}
		}

		Promise.all(asyncInitPromises)
			.then(() => {
				complete();
			})
			.catch(e => {
				this.reject(e);
			});

		if (asyncInitPromises.length === 0) {
			complete();
		}
		this.initialized = true;
	}
}
