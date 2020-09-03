const _ = require('lodash');

const STORE = Symbol('store');
const TTL = Symbol('ttl');
const MAX = Symbol('max');
const NAME = Symbol('name');
const IGNORE_ERRORS = Symbol('ignore_errors');

const MemoryStore = require('./stores/Memory');
const TitaniumPropertiesStore = require('./stores/TitaniumProperties');

class Cache {


	constructor(params = {}) {

		const { ttl = 0, store = 'memory', max = 0, ignoreErrors = false, name, saveValueInMemory = true } = params;

		if (typeof ttl !== 'number') {
			throw new TypeError('ttl must be a number');
		}

		if (typeof max !== 'number' || max < 0) {
			throw new TypeError('max must be a non-negative number');
		}

		if (store === 'memory') {
			this[STORE] = new MemoryStore(params);
		} else if (store === 'titanium-properties') {
			this[STORE] = new TitaniumPropertiesStore(params);
		} else if (typeof store !== 'object') {
			throw new TypeError('store must be an object');
		} else {
			this[STORE] = store;
		}


		this[TTL] = ttl;
		this[NAME] = name;
		this[MAX] = max || Infinity;
		this[IGNORE_ERRORS] = ignoreErrors;

	}

	get max () {
		return this[MAX];
	}

	async clear () {
		try {
			return await this[STORE].clear();
		} catch (error) {
			console.error(error);
			if (! this[IGNORE_ERRORS]) {
				throw error;
			} else {
				return false;
			}
		}
	}

	async delete (key) {
		try {
			if (typeof key !== 'string') {
				console.error(`⛔  cache.delete(${key}): invalid key`);
				throw new TypeError('key must be a string');
			}
			return await this[STORE].delete(key);
		} catch (error) {
			console.error(error);
			if (! this[IGNORE_ERRORS]) {
				throw error;
			} else {
				return false;
			}
		}
	}

	async get (key) {
		try {
			if (typeof key !== 'string') {
				console.error(`⛔  cache.get(${key}): invalid key`);
				throw new TypeError('key must be a string');
			}
			return await this[STORE].get(key);
		} catch (error) {
			console.error(error);
			if (! this[IGNORE_ERRORS]) {
				throw error;
			}
		}
	}

	async entry (key) {
		try {
			if (typeof key !== 'string') {
				console.error(`⛔  cache.entry(${key}): invalid key`);
				throw new TypeError('key must be a string');
			}
			return await this[STORE].entry(key);
		} catch (error) {
			console.error(error);
			if (! this[IGNORE_ERRORS]) {
				throw error;
			}
		}
	}

	async has (key) {
		try {
			if (typeof key !== 'string') {
				console.error(`⛔  cache.has(${key}): invalid key`);
				throw new TypeError('key must be a string');
			}
			return await this[STORE].has(key);
		} catch (error) {
			console.error(error);
			if (! this[IGNORE_ERRORS]) {
				throw error;
			} else {
				return false;
			}
		}
	}

	async set (key, value, ttl) {
		try {
			if (typeof key !== 'string') {
				console.error(`⛔  cache.set(${key}): invalid key`);
				throw new TypeError('key must be a string');
			}
			return await this[STORE].set(key, value, ttl);
		} catch (error) {
			console.error(error);
			if (! this[IGNORE_ERRORS]) {
				throw error;
			} else {
				return false;
			}
		}
	}


	get size () {
		try {
			return this[STORE].size;
		} catch (error) {
			console.error(error);
			if (! this[IGNORE_ERRORS]) {
				throw error;
			} else {
				return 0;
			}
		}
	}

	async prune () {
		try {
			return await this[STORE].prune();
		} catch (error) {
			console.error(error);
			if (! this[IGNORE_ERRORS]) {
				throw error;
			} else {
				return false;
			}
		}
	}


	get ttl () {
		return this[TTL];
	}

}


/***********************************
 * Define Time periods
 ***********************************/
Cache.ONE_MINUTE = 60; // 60
Cache.ONE_HOUR = Cache.ONE_MINUTE * 60; // 3600
Cache.ONE_DAY = Cache.ONE_HOUR * 24; // 86400
Cache.ONE_WEEK = Cache.ONE_DAY * 7; // 604800
Cache.ONE_YEAR = Cache.ONE_WEEK * 52; // 31449600


module.exports = Cache;
