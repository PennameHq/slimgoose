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
	const helper = { expect, assert }

	helper.patchNow = (now) => {
		Date.now = () => now
	}
	helper.resetDateNowFunc = () => {
		Date.now = _dateNowFunc
	}

	helper.printJson = (obj) => {
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
	}

	helper.withStubs = (testCb, opts = {}) => {
		return sinon.test(function () {
			// Add spy and stub methods to the testHelper
			helper.spy = this.spy
			helper.stub = this.stub

			this.clock.restore()
			return testCb.call(this)
		})
	}

	helper.assertionObjects = (objects, keys, opts = {}) => {
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
	}

	helper.assertDeepEqualObjects = (
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
	) => {
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
	}

	helper.assertDeepEqualObject = (object, keys, expectedValue, opts) => {
		if (keys === true) {
			// use keys from the expected values
			keys = Object.keys(expectedValue)
		}
		helper.assertDeepEqualObjects([object], keys, [expectedValue], opts)
	}

	helper.printResultDbObjects = (result, keys) => {
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
	}

	afterEach(() => {
		helper.resetDateNowFunc()
	})

	return helper
}
