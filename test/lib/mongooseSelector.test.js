/**
 * helper cheatsheet: https://github.com/sapegin/helper-cheat-sheet/blob/master/Readme.md
 */

const Q = require('q')
const slimgoose = require('../../lib/slimgoose')
const mongooseSelector = require('../../lib/mongooseSelector')
const mongoose = require('mongoose')
const SchemaBuilder = require('../../lib/SchemaBuilder')
const testDatabaseHelper = require('../../lib/testDatabaseHelper')
const { assert } = require('chai')

const helper = require('../helper')()
const { withStubs, expect } = helper
describe('mongooseSelector', () => {
	const _ = mongooseSelector

	describe('#freeze()', () => {
		let unit
		let invalidate

		beforeEach(() => {
			;[unit, invalidate] = helper.requireWithInvalidator('lib/mongooseSelector')
			helper.printJson(unit._isFrozen)
		})
		afterEach(() => {
			invalidate()
		})

		it(
			'should set the correct field to mark the selector as frozen',
			withStubs(() => {
				assert.isFalse(unit._isFrozen)
				unit.freeze()
				assert.isTrue(unit._isFrozen)
			}),
		)
	})

	describe('#use()', () => {
		let unit
		let invalidate

		beforeEach(() => {
			;[unit, invalidate] = helper.requireWithInvalidator('lib/mongooseSelector')
		})
		afterEach(() => {
			invalidate()
		})

		describe('when not frozen', () => {
			it('should set the selected mongoose instance to the provided', () => {
				const myMongoose = { foo: Date.now() }
				assert.notDeepEqual(unit.mongoose, myMongoose)

				unit.use(myMongoose)
				assert.deepEqual(unit.mongoose, myMongoose)
			})
		})

		describe('when frozen', () => {
			it(
				'should fail to set the selected mongoose instance to the provided',
				withStubs(() => {
					const myMongoose = { foo: Date.now() }
					unit._isFrozen = true

					try {
						unit.use(myMongoose)
						helper.expectFail()
					} catch (err) {
						assert.equal(
							err.message,
							'Attempted to set a custom mongoose after slimgoose has been initiated.',
						)
					}

					assert.notDeepEqual(unit.mongoose, myMongoose)
				}),
			)
		})
	})

	describe('#usePromiseClass()', () => {
		let unit
		let invalidate

		beforeEach(() => {
			;[unit, invalidate] = helper.requireWithInvalidator('lib/mongooseSelector')
		})
		afterEach(() => {
			invalidate()
		})

		it(
			'should set the selected mongoose instance to the provided',
			withStubs(() => {
				const myPromiseClass = class {
					then() {}
					catch() {}
				}
				helper.replace(unit, '_customMongoose', {})

				assert.notDeepEqual(unit.mongoose.Promise, myPromiseClass)
				unit.usePromiseClass(myPromiseClass)
				assert.deepEqual(unit.mongoose.Promise, myPromiseClass)
			}),
		)
	})
})
