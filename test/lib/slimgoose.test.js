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
describe('slimgoose', () => {
	const _ = slimgoose

	const getFreezeMongooseSpy = () => helper.spy(mongooseSelector, 'freeze')

	describe('#mongoose', () => {
		it('should be the selected mongoose instance', () => {
			expect(_.mongoose).to.equal(mongooseSelector.mongoose)
		})
	})

	describe('#Promise', () => {
		it('should be the selected mongoose Promise class', () => {
			expect(_.Promise).to.equal(mongooseSelector.Promise)
		})
	})

	describe('#schema()', () => {
		it('should return a SchemaBuilder instance', () => {
			const builder = _.schema({})
			expect(builder).to.be.instanceOf(SchemaBuilder)
		})

		it(
			'should freeze the mongoose instance',
			withStubs(() => {
				const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()
				_.schema({})

				expect(mongooseSelectorFreezeSpy.calledOnce)
			}),
		)
	})

	describe('#useMongoose()', () => {
		it(
			'should call the appropriate proxy to use the provided mongoose instance',
			withStubs(() => {
				const mongooseSelectorUseSpy = helper.stub(mongooseSelector, 'use').callsFake()

				const mongooseInstance = mongoose
				_.useMongoose(mongooseInstance)
				assert.deepEqual(mongooseSelectorUseSpy.lastCall.args, [mongooseInstance])
			}),
		)
	})

	describe('#useMongoosePromise()', () => {
		it(
			'should call the appropriate proxy to use the provided Promise class for the selected mongoose object',
			withStubs(() => {
				const mongooseSelectorUsePromiseClassSpy = helper
					.stub(mongooseSelector, 'usePromiseClass')
					.callsFake()

				const promiseClass = Q
				_.useMongoosePromise(promiseClass)
				assert.deepEqual(mongooseSelectorUsePromiseClassSpy.lastCall.args, [promiseClass])
			}),
		)
	})

	describe('#connect()', () => {
		it(
			'should call the appropriate proxy to connect to the default mongoose connection',
			withStubs(async () => {
				const connectSpy = helper.stub(mongoose, 'connect').resolves()
				const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()

				const uri = `mongo://${Date.now()}abc:123`
				const opts = { foo: 'bar' }

				expect(_.connected).to.equal(false)

				const result = await _.connect(uri, opts)
				assert.deepEqual(connectSpy.lastCall.args, [
					uri,
					{
						useNewUrlParser: true,
						...opts,
					},
				])

				expect(_.connected).to.equal(true)

				assert.isTrue(mongooseSelectorFreezeSpy.calledOnce)
			}),
		)
	})

	describe('#createConnection()', () => {
		describe('when a uri and opts are provided', () => {
			it(
				'should call the appropriate proxy to create the connection using the provided uri and opts',
				withStubs(async () => {
					const expectedResult = { open: () => {}, now: Date.now() }
					const createConnectionSpy = helper
						.stub(mongoose, 'createConnection')
						.callsFake(() => expectedResult)
					const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()

					const uri = `mongo://${Date.now()}abc:123`
					const opts = { foo: 'bar' }

					expect(_.createConnection(uri, opts)).to.equal(expectedResult)
					assert.deepEqual(createConnectionSpy.lastCall.args, [
						uri,
						{
							useNewUrlParser: true,
							...opts,
						},
					])

					assert.isTrue(mongooseSelectorFreezeSpy.calledOnce)
				}),
			)
		})

		describe('when uri and opts are not provided', () => {
			it(
				'should call the appropriate proxy to create the connection without configuration',
				withStubs(async () => {
					const expectedResult = { open: () => {}, now: Date.now() }
					const createConnectionSpy = helper
						.stub(mongoose, 'createConnection')
						.callsFake(() => expectedResult)
					const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()

					expect(_.createConnection()).to.equal(expectedResult)
					assert.deepEqual(createConnectionSpy.lastCall.args, [])

					assert.isTrue(mongooseSelectorFreezeSpy.calledOnce)
				}),
			)
		})

		describe('when only opts are provided', () => {
			it(
				'should call the appropriate proxy to create the connection without configuration',
				withStubs(async () => {
					const expectedResult = { open: () => {}, now: Date.now() }
					const createConnectionSpy = helper
						.stub(mongoose, 'createConnection')
						.callsFake(() => expectedResult)
					const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()

					const opts = { foo: 'bar' }
					expect(_.createConnection(undefined, opts)).to.equal(expectedResult)

					assert.deepEqual(createConnectionSpy.lastCall.args, [])

					assert.isTrue(mongooseSelectorFreezeSpy.calledOnce)
				}),
			)
		})
	})

	describe('#openConnection()', () => {
		it(
			'should call the appropriate proxy to connect to the default mongoose connection',
			withStubs(async () => {
				const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()

				const expectedResult = {
					uri: '//example.mongodb',
					now: Date.now(),
				}
				const createConnectionSpy = helper.stub(_, 'createConnection').callsFake(() => ({
					open: () => Q.resolve(expectedResult),
				}))

				const uri = `mongo://${Date.now()}abc:123`
				const opts = { foo: 'bar' }

				const result = await _.openConnection(uri, opts)
				expect(result).to.equal(expectedResult)
				assert.deepEqual(createConnectionSpy.lastCall.args, [uri, opts])

				assert.isTrue(mongooseSelectorFreezeSpy.calledOnce)
			}),
		)
	})

	describe('#connectDefaultForTest()', () => {
		it(
			'should call the appropriate proxy to connect to the default mongoose connection to a test mongod server',
			withStubs(async () => {
				const connectSpy = helper.stub(_, 'connect').callsFake(Q.resolve)
				const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()

				const opts = { foo: 'bar' }

				expect(_._hasDefaultTestConnection).to.equal(false)

				await _.connectDefaultForTest(opts)
				assert.isTrue(connectSpy.calledOnce)

				const callArgs = connectSpy.lastCall.args
				expect(callArgs[1]).to.equal(opts)
				const createdConnectionUri = callArgs[0]

				expect(createdConnectionUri.startsWith('mongodb://127.0.0.1:')).to.equal(true)
				assert.isAtLeast(createdConnectionUri.length, 30)

				expect(_._hasDefaultTestConnection).to.equal(true)

				assert.isTrue(mongooseSelectorFreezeSpy.calledOnce)
			}),
		)
	})

	describe('#resetDefaultForTest()', () => {
		it(
			'should call the correct function to reset the test mongod connection database when one has been created',
			withStubs(async () => {
				const resetDefaultDatabaseSpy = helper
					.stub(testDatabaseHelper, 'resetDefaultDatabase')
					.resolves()

				_._hasDefaultTestConnection = true

				await _.resetDefaultForTest()

				assert.isTrue(resetDefaultDatabaseSpy.calledOnce)
			}),
		)

		it(
			'should not call the function to reset the test mongod connection database when one has not been created',
			withStubs(async () => {
				const resetDefaultDatabaseSpy = helper
					.stub(testDatabaseHelper, 'resetDefaultDatabase')
					.resolves()

				_._hasDefaultTestConnection = false

				await _.resetDefaultForTest()

				assert.isFalse(resetDefaultDatabaseSpy.called)
			}),
		)
	})
})
