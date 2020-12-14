const path = require('path')
const chai = require('chai')
const deepSet = require('deep-set')
const { is } = require('ramda')
const { assert, expect } = chai
// for stubbing, spying, mocking: https://www.sitepoint.com/sinon-tutorial-javascript-testing-mocks-spies-stubs/
const sinon = require('sinon')
const sinonTest = require('sinon-test')(sinon)
sinon.test = sinonTest

const _dateNowFunc = Date.now

const VALID_OBJECT_ID_REGEX = new RegExp('^[0-9a-fA-F]{24}$')

function isValidId(objectId) {
	if (!objectId) return false
	return VALID_OBJECT_ID_REGEX.test(objectId)
}

const isString = (o) => is(String, o)
const isArray = (o) => is(Array, o)
const isObject = (o) => is(Object, o)

// modified from https://github.com/developit/dlv/blob/master/index.js
function deepGet(obj, key, def, p) {
	p = 0
	key = key.split ? key.split('.') : key
	while (obj && p < key.length) obj = obj[key[p++]]
	return obj === undefined || obj === null ? def : obj
}

const objectUtils = {
	// modified from https://github.com/developit/dlv/blob/master/index.js
	deepGet(obj, key, def, p) {
		p = 0
		key = key.split ? key.split('.') : key
		while (obj && p < key.length) obj = obj[key[p++]]
		return obj === undefined || obj === null ? def : obj
	},
}

module.exports = () => {
	const helper = {
		assert,
		expect,
		patchNow(now) {
			Date.now = () => now
		},
		resetDateNowFunc() {
			Date.now = _dateNowFunc
		},
		printJson(obj) {
			console.log(
				JSON.stringify(
					obj,
					(k, v) => {
						if (v === undefined) return null
						return v
					},
					4,
				),
			)
		},
		withStubs(testCb, opts = {}) {
			const self = this
			return sinon.test(function () {
				// Add spy and stub methods to the testHelper
				self.spy = this.spy
				self.stub = this.stub

				this.clock.restore()
				return testCb.call(this)
			})
		},
		assertionObjects(objects, keys, opts = {}) {
			const resultArr = []
			objects.forEach((obj, index) => {
				if (!keys || !keys.length) {
					keys = Object.keys(obj)
				}

				const resultObject = keys.reduce((map, key) => {
					let value
					if (key.includes('.')) {
						value = objectUtils.deepGet(obj, key)
					} else {
						value = obj[key]
					}

					if (is(String, value) || isValidId(value)) {
						value = `${value}`
					} else if (is(Array, value)) {
						value = value.map((v) => {
							if (v === undefined) return null

							if (is(String, v) || isValidId(v)) {
								v = `${v}`
							}

							return v
						}, 4)
					}

					deepSet(map, key, value)
					return map
				}, {})

				if (opts.transform) {
					opts.transform({ object: resultObject, index })
				}
				resultArr.push(resultObject)
			})
			return resultArr
		},
		assertDeepEqualObjects(
			objects,
			keys,
			expectedValues,
			opts = {
				// whether or not to transform result to string and back to JSON object
				json: false,
				transform: undefined,
				sorter: undefined,
				print: false,
				printTransformedKeys: undefined,
			},
		) {
			if (opts.sorter) {
				objects = objects.sort(opts.sorter)
			}

			if (!keys.length) {
				throw new Error('Must provided keys')
			}

			let result = helper.assertionObjects(objects, keys, opts)

			if (opts.json) {
				result = JSON.parse(JSON.stringify(result))
			}

			if (opts.print) {
				if (opts.printTransformedKeys) {
					arrays.mergeInPlace(keys, opts.printTransformedKeys)
				}
				helper.printResultDbObjects({ dbObjects: result }, keys)
			}

			assert.deepEqual(result, expectedValues)
		},

		assertDeepEqualObject(object, keys, expectedValue, opts) {
			if (keys === true) {
				// use keys from the expected values
				keys = Object.keys(expectedValue)
			}
			this.assertDeepEqualObjects([object], keys, [expectedValue], opts)
		},
		printResultDbObjects(result, keys) {
			let s = ''
			const lastKey = keys[keys.length - 1]
			result.dbObjects.forEach((dbObject) => {
				if (!keys || !keys.length) {
					keys = Object.keys(object)
				}

				let currentS = keys.reduce((builder, key, index) => {
					let value = dbObject[key]
					if (isString(value) || isValidId(value)) {
						value = `'${value}'`
					} else if (isArray(value) || isObject(value)) {
						value = JSON.stringify(
							value,
							(k, v) => {
								if (v === undefined) return null
								return v
							},
							4,
						)
					}
					let entry = `${key}: ${value}`

					if (index === 0) {
						entry = `{${entry}`
					} else {
						entry = ` ${entry}`
					}

					if (key == lastKey) {
						entry = `${entry}}`
					} else {
						entry = `${entry},`
					}

					builder = `${builder}${entry}`
					return builder
				}, '')
				s += `${currentS},\n`
			})
			console.log(s)
		},

		/**
		 * To avoid collision errors,
		 * you may need to call this to clear,restore sinon stubs between tests
		 * if 1) you are using sinon directly [instead of leveraging #withStubs()]
		 *       in any repeating part of your test suite or
		 * 2) you stubbed something via sinon directly and need to restore it at the end of your test suite.
		 *
		 * If you are using #withStubs() on the top level `describe` suite in your test file,
		 * you should call this in its `#afterAll()` function to avoid collision errors.
		 *
		 * Otherwise, you don't need to call it if you're using #withStubs() on each `it` test
		 * so long as you're not using sinon directly for stubs elsewhere in your test suite.
		 */
		clearStubs() {
			sinon.restore()
		},

		/**
		 * @param {String} pathFromRoot The path to the file you need to require
		 * from the root of the file structure
		 */
		requireWithInvalidator(pathFromRoot) {
			const resolvedPath = this.resolvePathFromRoot(pathFromRoot)
			const invalidate = () => this.invalidateModulesCache(resolvedPath)

			// First, invalidate any existing cache for the module
			invalidate()

			let mod = require(resolvedPath)
			if (mod.__esModule) {
				mod = mod.default
			}

			return [mod, invalidate]
		},

		/**
		 * Invalidate the require(...) cache.
		 * @param {String} pathFromRoot The path to the file you need to invalidate
		 * from the root of the file structure
		 */
		invalidateModulesCache(pathFromRoot) {
			// Clear the constants module from the cache
			delete require.cache[this.resolvePathFromRoot(pathFromRoot)]
		},

		/**
		 * Resolves a file path from the root of the file structure.
		 * @param {String} path
		 */
		resolvePathFromRoot(pathFromRoot) {
			return require.resolve(path.resolve(pathFromRoot))
		},

		/**
		 * Require a file from the root of the file structure.
		 * @param {String} path
		 */
		requireFromRoot(path) {
			return require(this.resolvePathFromRoot(path))
		},

		/**
		 * Enqueue a task onto the tear down tasks
		 * that will be ran in order during #tearDown()
		 * @param {Function} task
		 */
		enqueueTearDownTask(task) {
			helper.tearDownTasks.push(task)
		},

		/**
		 * Dequeue and run all tear down tasks
		 */
		runTearDownTasks() {
			while (helper.tearDownTasks.length) {
				helper.tearDownTasks.shift()()
			}
		},
		/**
		 * Call before each test run to setup any dependencies.
		 *
		 * Subclasses can implement own setup logic
		 * @interface
		 */
		setup() {},
		/**
		 * Should be called after each test
		 * to teardown any side effects that were introduced during the test run or its setup.
		 */
		tearDown() {
			helper.runTearDownTasks()
			helper.clearStubs()
		},
		/**
		 * A helper for testing an expected failure in an operation or entire test case.
		 *
		 * If the operation does not throw or there is no operation provided,
		 * this helper will throw an error.
		 *
		 * @param {?Function} operation
		 * @param {?Function<Error>} onFail This will always be called with whatever the operation throws.
		 */
		expectFail(operation, onFail) {
			if (!operation && onFail) {
				throw new Error('Cannot provide onFail without an operation to run.')
			}

			try {
				if (operation) {
					operation()
				}

				throw new Error('This operation should have failed.')
			} catch (err) {
				if (!onFail) {
					throw err
				}

				onFail(err)
			}
		},
	}

	afterEach(() => {
		helper.resetDateNowFunc()
	})

	helper.setup = helper.setup.bind(helper)
	helper.tearDown = helper.tearDown.bind(helper)
	helper.withStubs = helper.withStubs.bind(helper)

	helper.enqueueTearDownTask = helper.enqueueTearDownTask.bind(helper)
	helper.resolvePathFromRoot = helper.resolvePathFromRoot.bind(helper)
	helper.requireFromRoot = helper.requireFromRoot.bind(helper)
	helper.requireWithInvalidator = helper.requireWithInvalidator.bind(helper)
	helper.invalidateModulesCache = helper.invalidateModulesCache.bind(helper)
	helper.patchNow = helper.patchNow.bind(helper)
	helper.expectFail = helper.expectFail.bind(helper)
	return helper
}
