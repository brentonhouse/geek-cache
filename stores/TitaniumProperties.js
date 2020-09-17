const _ = require('lodash');
const stringify = require('fast-safe-stringify');
const logger = require('@geek/logger').createLogger('@geek/cache',{ meta: { filename: __filename }});
const MAX = Symbol('max');
const TTL = Symbol('ttl');
const CACHE = Symbol('cache');
const PREFIX = Symbol('prefix');
const MEMORY_VALUE = Symbol('save-value-in-memory');

const store_name = 'TitaniumPropertiesStore';

/***********************************
 * Define Time periods
 ***********************************/
const ONE_MINUTE = 60; // 60
const ONE_HOUR = ONE_MINUTE * 60; // 3600
const ONE_DAY = ONE_HOUR * 24; // 86400
const ONE_WEEK = ONE_DAY * 7; // 604800
const ONE_YEAR = ONE_WEEK * 52; // 31449600

/***********************************
 * Define Metadata
 ***********************************/

class TitaniumPropertiesStore {
	constructor(params = {}) {
		logger.track(`💰  you are here → ${store_name}.constructor()`);
		const { ttl = 0, max = 0, prefix = 'turbocache__', name, saveValueInMemory = true } = params;

		if (typeof ttl !== 'number') {
			throw new TypeError('ttl must be a number');
		}

		if (typeof name !== 'string' || name.trim().length < 1) {
			throw new TypeError('name must be a string');
		}

		if (typeof max !== 'number' || max < 0) {
			throw new TypeError('max must be a non-negative number');
		}

		this[MAX] = max || Infinity;
		this[TTL] = ttl;
		this[MEMORY_VALUE] = saveValueInMemory;
		this[PREFIX] = prefix + _ + name.trim();
		this[CACHE] = new Map();
		this.refresh();
	}

	async clear() {
		// logger.track(`💰  you are here → ${store_name}.clear()`);
		return await clear(this);
	}

	async delete(key) {
		// logger.track(`💰  you are here → ${store_name}.delete()`);
		return await del(this, key);
	}

	async get(key) {
		// logger.track(`💰  you are here → ${store_name}.get()`);
		const result = await get(this, key);
		// logger.verbose(`💰  get result: ${JSON.stringify(result, null, 2)}`);
		return result;
	}

	// async entry(key) {
	// 	// logger.track(`💰  you are here → ${store_name}.entry()`);
	// 	const result = await entry(this, key);
	// 	// logger.verbose(`💰  entry result: ${JSON.stringify(result, null, 2)}`);
	// 	return result;
	// }

	async has(key) {
		logger.track(`💰  you are here → ${store_name}.has(${key})`);
		const result = this[CACHE].has(key);
		logger.debug(`💰  has result: ${JSON.stringify(result, null, 2)}`);
		return result;
	}

	async keys() {
		logger.track(`💰  you are here → ${store_name}.keys()`);
		return Array.from(this[CACHE].keys());
	}

	async set(key, value, ttl) {
		// logger.track(`💰  you are here → ${store_name}.set()`);
		return await set(this, key, value, ttl);
	}

	async refresh() {
		// logger.track(`💰  you are here → ${store_name}.refresh()`);
		return await refresh(this);
	}

	get size() {
		logger.track(`💰  you are here → ${store_name}.size`);
		return this[CACHE].size;
	}

}

const generateName = (self, key) => {
	return self[PREFIX] + _.trim(key).toLowerCase().replace(/\s+/g, '_');
};

const refresh = async self => {
	logger.track(`💰  you are here → ${store_name}.refresh()`);

	const entries = [];
	const properties = _.filter(Ti.App.Properties.listProperties(), name =>
		name.startsWith(self[PREFIX])
	);

	// console.error(`💰 cache properties: ${JSON.stringify(properties, null, 2)}`);

	for (const name of properties) {
		const entry = Ti.App.Properties.getObject(name);
		if (_.isObject(entry)) {
			if (isStale(self, entry)) {
				await del(entry.key);
			} else {
				entries.push([ entry.key, entry ]);
			}
		} else {
			// if this is not an object, then it is an invalid cache item
			Ti.App.Properties.removeProperty(name);
		}
	}

	// console.error(`🦠 loaded entries: ${JSON.stringify(entries, null, 2)}`);
	self[CACHE].clear();
	self[CACHE] = new Map(entries.sort((a, b) => (a[1].now > b[1].now ? 1 : -1)));

	// console.error(`💰  refreshed self[CACHE]:`);
	// console.error(self[CACHE]);
};

// const entry = async (self, key, force = false) => {
// 	logger.track(`💰  you are here → ${store_name}.entry(${key})`);
// 	if (typeof key !== 'string') {
// 		console.error(`💰  ${store_name}.entry() → TypeError: key must be a string`);
// 		throw new TypeError('key must be a string');
// 	}

// 	const entry = self[CACHE].get(key);
// 	// logger.debug(`💰  entry: ${JSON.stringify(entry, null, 2)}`);

// 	if (!force && entry) {
// 		if (isStale(self, entry)) {
// 			logger.debug(`💰  cache miss (${key})`);
// 			await del(self, key);
// 			await del(self, key);
// 			return undefined;
// 		}

// 		logger.debug(`💰  cache hit (${key})`);
// 		return entry;
// 	}
// };

const get = async (self, key) => {
	logger.track(`💰  you are here → ${store_name}.get(${key})`);
	if (typeof key !== 'string') {
		console.error(`💰  ${store_name}.get() → TypeError: key must be a string`);
		throw new TypeError('key must be a string');
	}

	const entry = self[CACHE].get(key);
	// logger.verbose(`🦠  entry: ${JSON.stringify(entry, null, 2)}`);

	if (entry) {
		if (isStale(self, entry)) {
			logger.debug(`💰  cache miss (${key})`);
			await del(self, key);
			return undefined;
		}

		logger.debug(`💰  cache hit (${key})`);
		return entry.value;
	}
};

const set = async (self, key, value, ttl) => {
	logger.track(`💰  you are here → ${store_name}.set(${key})`);
	if (typeof key !== 'string') {
		console.error('💰  cache.set() → TypeError: key must be a string');
		throw new TypeError('set key must be a string');
	}

	ttl = ttl || self[TTL];

	if (ttl && typeof ttl !== 'number') {
		throw new TypeError('ttl must be a number');
	}

	// console.error(self[CACHE]);

	const name = generateName(self, key);
	const now = ttl ? Date.now() : 0;

	const hash = require('crypto').createHash('md5').update(JSONC.stringify(value)).digest('hex');
	const entry = new Entry({ key, now, ttl, hash });

	if (self[MEMORY_VALUE]) {
		entry.value = value;
	}
	// logger.debug(`💰  entry: ${JSON.stringify(entry, null, 2)}`);

	// delete any old entry for this key
	if (self[CACHE].has(key)) {

		if (self[CACHE].get(key).hash !== entry.hash) {
			Ti.App.Properties.setObject(name, entry);
		}
		await self[CACHE].delete(key);

	} else {
		Ti.App.Properties.setObject(name, entry);
	}

	self[CACHE].set(key, entry);


	// is the size of the cache over the max?
	if (self[CACHE].size > self[MAX]) {
		// delete the oldest entry
		await del(self, self[CACHE].keys().next().value);
	}

	// console.error(`💰  self[CACHE]:`);
	// console.error(self[CACHE]);

	return entry.hash;
};

const clear = async self => {
	logger.track(`💰  you are here → ${store_name}.clear()`);

	for (const key of self[CACHE].keys()) {
		await del(self, key);
	}

	// Just to make sure we don't have any orphaned properties...
	const properties = _.filter(Ti.App.Properties.listProperties(), name =>
		name.startsWith(self[PREFIX])
	);
	logger.debug(`💰  orphaned cache properties: ${JSON.stringify(properties, null, 2)}`);

	for (const name of properties) {
		const entry = Ti.App.Properties.getObject(name);
		const key = _.get(entry, 'key');
		key && (await del(self, key));
	}

	return true;
};

const del = async (self, key) => {
	logger.track(`💰  you are here → ${store_name}.del(${key})`);
	if (typeof key !== 'string') {
		console.error(`💰  ${store_name}.del() → TypeError: key must be a string`);
		throw new TypeError('key must be a string');
	}

	self[CACHE].delete(key);
	const name = generateName(self, key);
	Ti.App.Properties.removeProperty(name);
};

const isStale = (self, entry = {}) => {
	let { ttl = (self[TTL] = Infinity) } = entry;
	ttl = parseInt(ttl) || Infinity;
	if (ttl === Infinity) {
		return false;
	}
	// difference between now and datetime of entry (in seconds)
	const diff = (Date.now() - entry.now) / 1000;
	logger.debug(`💰  cache entry difference (in seconds): ${JSON.stringify(diff, null, 2)}`);
	// return entry.ttl ? diff > entry.ttl : self[TTL] && (diff > self[TTL]);
	return diff > ttl;
};

/***********************************
 * Define Cache Entry
 ***********************************/

class Entry {
	constructor(params = {}) {
		const { key, value, length = 0, now = Date.now(), ttl = 0, hash } = params;
		this.key = key;
		this.value = value;
		this.length = length;
		this.now = now;
		this.ttl = ttl;
		this.hash = hash;
	}
}

module.exports = TitaniumPropertiesStore;
