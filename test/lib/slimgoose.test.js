const Q = require('q')
const slimgoose = require('../../lib/slimgoose')
const mongooseSelector = require('../../lib/mongooseSelector')
const mongoose = require('mongoose')
const SchemaBuilder = require('../../lib/SchemaBuilder')

describe('slimgoose', () => {
	const _ = slimgoose
	beforeEach(() => {
		jest.resetModules()
	})

	describe('#schema()', () => {
		it('returns a SchemaBuilder instance', () => {
			const builder = _.schema({})
			expect(builder).toBeInstanceOf(SchemaBuilder)
		})

		it('freezes the mongoose instance', () => {
			const mongooseSelectorFreezeSpy = jest.spyOn(mongooseSelector, 'freeze')
			_.schema({})

			expect(mongooseSelectorFreezeSpy).toHaveBeenCalled()
		})
	})

	describe('#useMongoose()', () => {
		it('calls the appropriate proxy to use the provided mongoose instance', () => {
			const mongooseSelectorUseSpy = jest.spyOn(mongooseSelector, 'use').mockImplementation()

			const mongooseInstance = mongoose
			_.useMongoose(mongooseInstance)
			expect(mongooseSelectorUseSpy).toHaveBeenCalledWith(mongooseInstance)
		})
	})

	describe('#useMongoosePromise()', () => {
		it('calls the appropriate proxy to use the provided Promise class for the selected mongoose object', () => {
			const mongooseSelectorUsePromiseClassSpy = jest
				.spyOn(mongooseSelector, 'usePromiseClass')
				.mockImplementation()

			const promiseClass = Q
			_.useMongoosePromise(promiseClass)
			expect(mongooseSelectorUsePromiseClassSpy).toHaveBeenCalledWith(promiseClass)
		})
	})

	describe('#connect()', () => {
		it('calls the appropriate proxy to use the provided mongoose instance', async () => {
			const mongooseSelectorUseSpy = jest.spyOn(mongoose, 'connect').mockImplementation(Q.resolve)

			const url = `mongo://${Date.now()}abc:123`
			const opts = { foo: 'bar' }

			expect(_.connected).toBe(false)

			const result = await _.connect(url, opts)
			expect(mongooseSelectorUseSpy).toHaveBeenCalledWith(url, opts)

			expect(_.connected).toBe(true)
		})
	})
})
