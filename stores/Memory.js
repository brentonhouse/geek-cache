const MAX = Symbol('max');
const TTL = Symbol('ttl');
const CACHE = Symbol('cache');

const logger = require('@geek/logger');

const store_name = 'MemoryStore';

class MemoryStore {

	constructor(params = {}) {
		logger.track(`💰  you are here → ${store_name}.constructor()`);
		const { ttl = 0, max = 0 } = params;

		if (typeof ttl !== 'number') {
			throw new TypeError('ttl must be a number');
		}

		if (typeof max !== 'number' || max < 0) {
			throw new TypeError('max must be a non-negative number');
	 }

		this[MAX] = max || Infinity;
		this[TTL] = ttl;
		this[CACHE] = new Map();

	}

	async clear () {
		logger.track(`💰  you are here → ${store_name}.clear()`);
		return this[CACHE].clear();
	}

	async delete (key) {
		logger.track(`💰  you are here → ${store_name}.delete()`);
		return await del(this, key);
	}

	async get (key) {
		logger.track(`💰  you are here → ${store_name}.get()`);
		const result = await get(this, key);
		logger.debug(`💰  get result: ${JSON.stringify(result, null, 2)}`);
		return result;
	}

	async has (key) {
		logger.track(`💰  you are here → ${store_name}.has()`);
		return this[CACHE].has(key);
	}

	async keys () {
		logger.track(`💰  you are here → ${store_name}.keys()`);
		return Array.from(this[CACHE].keys());
	}

	async set (key, value, ttl) {
		logger.track(`💰  you are here → ${store_name}.set()`);
		return await set(this, key, value, ttl);
	}

	get size () {
		logger.track(`💰  you are here → ${store_name}.size`);
		return this[CACHE].size;
	}


}

const set = async (self, key, value, ttl) => {

	if (typeof key !== 'string') {
		throw new TypeError('key must be a string');
	}

	ttl = ttl || self[TTL];

	if (ttl && typeof ttl !== 'number') {
		throw new TypeError('ttl must be a number');
	}

	// const now = ttl ? Date.now() : 0;

	const entry = new Entry({ key, value, ttl });

	logger.debug(`💰  entry: ${JSON.stringify(entry, null, 2)}`);

	// delete any old entry for this key
	if (self[CACHE].has(key)) {
		self[CACHE].delete(key);
	}

	self[CACHE].set(key, entry);

	// is the size of the cache over the max?
	if (self[CACHE].size > self[MAX]) {
		// delete the oldest entry
		await del(self[CACHE].keys().next().value);
	}

	console.error(`💰  self[CACHE]: ${JSON.stringify(self[CACHE], null, 2)}`);

	return true;
};

const del = async (self, key) => {

	if (typeof key !== 'string') {
		throw new TypeError('key must be a string');
	}

	self[CACHE].delete(key);
};

const get = async (self, key) => {

	if (typeof key !== 'string') {
		throw new TypeError('key must be a string');
	}

	const entry = self[CACHE].get(key);
	logger.debug(`💰  entry: ${JSON.stringify(entry, null, 2)}`);

	if (entry) {

		if (isStale(self, entry)) {
			logger.track(`💰  cache miss (${key})`);
			await del(self, key);
			return undefined;
		}

		logger.track(`💰  cache hit (${key})`);
		return entry.value;
	}
};

const isStale = (self, entry = {}) => {
	let { ttl = self[TTL] = Infinity } = entry;
	ttl = parseInt(ttl) || Infinity;
	if (ttl === Infinity) {
		return false;
	}
	// difference between now and datetime of entry (in seconds)
	const diff = (Date.now() - entry.now) / 1000;
	logger.debug(`🦠  cache entry difference (in seconds): ${JSON.stringify(diff, null, 2)}`);
	// return entry.ttl ? diff > entry.ttl : self[TTL] && (diff > self[TTL]);
	return diff > ttl;
};

/***********************************
 * Define Cache Entry
 ***********************************/

class Entry {
	constructor (params = {}) {
	  const { key, value, length = 0, now = Date.now(), ttl = 0 } = params;
	  this.key = key;
	  this.value = value;
	  this.length = length;
	  this.now = now;
	  this.ttl = ttl;
	}
}

module.exports = MemoryStore;
