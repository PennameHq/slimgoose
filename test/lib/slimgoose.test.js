/**
 * Jest cheatsheet: https://github.com/sapegin/jest-cheat-sheet/blob/master/Readme.md
 */

const Q = require('q')
const slimgoose = require('../../lib/slimgoose')
const mongooseSelector = require('../../lib/mongooseSelector')
const mongoose = require('mongoose')
const SchemaBuilder = require('../../lib/SchemaBuilder')
const testDatabaseHelper = require('../../lib/testDatabaseHelper')

describe('slimgoose', () => {
	const _ = slimgoose

	const getFreezeMongooseSpy = () => jest.spyOn(mongooseSelector, 'freeze')

	beforeEach(() => {
		jest.resetModules()
		jest.resetAllMocks()
	})

	describe('#mongoose', () => {
		it('should be the selected mongoose instance', () => {
			expect(_.mongoose).toBe(mongooseSelector.mongoose)
		})
	})

	describe('#Promise', () => {
		it('should be the selected mongoose Promise class', () => {
			expect(_.Promise).toBe(mongooseSelector.Promise)
		})
	})

	describe('#schema()', () => {
		it('should return a SchemaBuilder instance', () => {
			const builder = _.schema({})
			expect(builder).toBeInstanceOf(SchemaBuilder)
		})

		it('should freeze the mongoose instance', () => {
			const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()
			_.schema({})

			expect(mongooseSelectorFreezeSpy).toHaveBeenCalled()
		})
	})

	describe('#useMongoose()', () => {
		it('should call the appropriate proxy to use the provided mongoose instance', () => {
			const mongooseSelectorUseSpy = jest.spyOn(mongooseSelector, 'use').mockImplementation()

			const mongooseInstance = mongoose
			_.useMongoose(mongooseInstance)
			expect(mongooseSelectorUseSpy).toHaveBeenCalledWith(mongooseInstance)
		})
	})

	describe('#useMongoosePromise()', () => {
		it('should call the appropriate proxy to use the provided Promise class for the selected mongoose object', () => {
			const mongooseSelectorUsePromiseClassSpy = jest
				.spyOn(mongooseSelector, 'usePromiseClass')
				.mockImplementation()

			const promiseClass = Q
			_.useMongoosePromise(promiseClass)
			expect(mongooseSelectorUsePromiseClassSpy).toHaveBeenCalledWith(promiseClass)
		})
	})

	describe('#connect()', () => {
		it('should call the appropriate proxy to connect to the default mongoose connection', async () => {
			const connectSpy = jest.spyOn(mongoose, 'connect').mockImplementation(Q.resolve)
			const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()

			const uri = `mongo://${Date.now()}abc:123`
			const opts = { foo: 'bar' }

			expect(_.connected).toBe(false)

			const result = await _.connect(uri, opts)
			expect(connectSpy).toHaveBeenCalledWith(uri, {
				useNewUrlParser: true,
				...opts,
			})

			expect(_.connected).toBe(true)

			expect(mongooseSelectorFreezeSpy).toHaveBeenCalled()
		})
	})

	describe('#createConnection()', () => {
		describe('when a uri and opts are provided', () => {
			it('should call the appropriate proxy to create the connection using the provided uri and opts', async () => {
				const expectedResult = { open: () => {}, now: Date.now() }
				const createConnectionSpy = jest
					.spyOn(mongoose, 'createConnection')
					.mockImplementation(() => expectedResult)
				const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()

				const uri = `mongo://${Date.now()}abc:123`
				const opts = { foo: 'bar' }

				expect(_.createConnection(uri, opts)).toBe(expectedResult)
				expect(createConnectionSpy).toHaveBeenCalledWith(uri, {
					useNewUrlParser: true,
					...opts,
				})

				expect(mongooseSelectorFreezeSpy).toHaveBeenCalled()
			})
		})

		describe('when uri and opts are not provided', () => {
			it('should call the appropriate proxy to create the connection without configuration', async () => {
				const expectedResult = { open: () => {}, now: Date.now() }
				const createConnectionSpy = jest
					.spyOn(mongoose, 'createConnection')
					.mockImplementation(() => expectedResult)
				const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()

				expect(_.createConnection()).toBe(expectedResult)
				expect(createConnectionSpy).toHaveBeenCalledWith()

				expect(mongooseSelectorFreezeSpy).toHaveBeenCalled()
			})
		})

		describe('when only opts are provided', () => {
			it('should call the appropriate proxy to create the connection without configuration', async () => {
				const expectedResult = { open: () => {}, now: Date.now() }
				const createConnectionSpy = jest
					.spyOn(mongoose, 'createConnection')
					.mockImplementation(() => expectedResult)
				const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()

				const opts = { foo: 'bar' }
				expect(_.createConnection(undefined, opts)).toBe(expectedResult)

				expect(createConnectionSpy).toHaveBeenCalledWith()

				expect(mongooseSelectorFreezeSpy).toHaveBeenCalled()
			})
		})
	})

	describe('#openConnection()', () => {
		it('should call the appropriate proxy to connect to the default mongoose connection', async () => {
			const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()

			const expectedResult = {
				uri: '//example.mongodb',
				now: Date.now(),
			}
			const createConnectionSpy = jest.spyOn(_, 'createConnection').mockImplementation(() => ({
				open: () => Q.resolve(expectedResult),
			}))

			const uri = `mongo://${Date.now()}abc:123`
			const opts = { foo: 'bar' }

			const result = await _.openConnection(uri, opts)
			expect(result).toBe(expectedResult)
			expect(createConnectionSpy).toHaveBeenCalledWith(uri, opts)

			expect(mongooseSelectorFreezeSpy).toHaveBeenCalled()
		})
	})

	describe('#connectDefaultForTest()', () => {
		it('should call the appropriate proxy to connect to the default mongoose connection to a test mongod server', async () => {
			const connectSpy = jest.spyOn(_, 'connect').mockImplementation(Q.resolve)
			const mongooseSelectorFreezeSpy = getFreezeMongooseSpy()

			const opts = { foo: 'bar' }

			expect(_._hasDefaultTestConnection).toBe(false)

			await _.connectDefaultForTest(opts)
			expect(connectSpy).toHaveBeenCalled()

			const callArgs = connectSpy.mock.calls[0]
			expect(callArgs[1]).toBe(opts)
			const createdConnectionUri = callArgs[0]

			expect(createdConnectionUri.startsWith('mongodb://127.0.0.1:')).toBe(true)
			expect(createdConnectionUri.length).toBeGreaterThanOrEqual(30)

			expect(_._hasDefaultTestConnection).toBe(true)

			expect(mongooseSelectorFreezeSpy).toHaveBeenCalled()
		})
	})

	describe('#resetDefaultForTest()', () => {
		it('should call the correct function to reset the test mongod connection database when one has been created', async () => {
			const resetDefaultDatabaseSpy = jest
				.spyOn(testDatabaseHelper, 'resetDefaultDatabase')
				.mockImplementation(Q.resolve)

			_._hasDefaultTestConnection = true

			await _.resetDefaultForTest()

			expect(resetDefaultDatabaseSpy).toHaveBeenCalled()
		})

		it('should not call the function to reset the test mongod connection database when one has not been created', async () => {
			const resetDefaultDatabaseSpy = jest
				.spyOn(testDatabaseHelper, 'resetDefaultDatabase')
				.mockImplementation(Q.resolve)

			_._hasDefaultTestConnection = false

			await _.resetDefaultForTest()

			expect(resetDefaultDatabaseSpy).not.toHaveBeenCalled()
		})
	})
})
