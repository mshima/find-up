'use strict';
const path = require('path');
const locatePath = require('locate-path');
const pathExists = require('path-exists');

const stop = Symbol('findUp.stop');

const createPathIteratable = function * ({cwd} = {}) {
	let currentDirectory = path.resolve(cwd || '');
	const {root} = path.parse(currentDirectory);

	yield currentDirectory;
	while (currentDirectory !== root) {
		currentDirectory = path.dirname(currentDirectory);
		yield currentDirectory;
	}
};

const createAsyncPathIteratable = async function * (options) {
	const iterable = createPathIteratable(options);
	for (const directory of iterable) {
		yield directory;
	}
};

module.exports = async (name, iterable, options = {}) => {
	if (!iterable || typeof iterable[Symbol.asyncIterator] !== 'function') {
		options = iterable || {};
		iterable = createAsyncPathIteratable(options);
	}

	const paths = [].concat(name);

	const runMatcher = async locateOptions => {
		if (typeof name !== 'function') {
			return locatePath(paths, locateOptions);
		}

		const foundPath = await name(locateOptions.cwd);
		if (typeof foundPath === 'string') {
			return locatePath([foundPath], locateOptions);
		}

		return foundPath;
	};

	for await (const directory of iterable) {
		const foundPath = await runMatcher({...options, cwd: directory});

		if (foundPath === stop) {
			return;
		}

		if (foundPath) {
			return path.resolve(directory, foundPath);
		}
	}
};

module.exports.sync = (name, iterable, options = {}) => {
	if (!iterable || typeof iterable[Symbol.iterator] !== 'function') {
		options = iterable || {};
		iterable = createPathIteratable(options);
	}

	const paths = [].concat(name);

	const runMatcher = locateOptions => {
		if (typeof name !== 'function') {
			return locatePath.sync(paths, locateOptions);
		}

		const foundPath = name(locateOptions.cwd);
		if (typeof foundPath === 'string') {
			return locatePath.sync([foundPath], locateOptions);
		}

		return foundPath;
	};

	for (const directory of iterable) {
		const foundPath = runMatcher({...options, cwd: directory});

		if (foundPath === stop) {
			return;
		}

		if (foundPath) {
			return path.resolve(directory, foundPath);
		}
	}
};

module.exports.exists = pathExists;

module.exports.sync.exists = pathExists.sync;

module.exports.stop = stop;
