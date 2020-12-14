/**
 * Jest cheatsheet: https://github.com/sapegin/jest-cheat-sheet/blob/master/Readme.md
 */

const mongoose = require('mongoose')
const mongooseSelector = require('../../lib/mongooseSelector')
const SchemaBuilder = require('../../lib/SchemaBuilder')
const helper = require('../helper')

describe('schemaBuilder', () => {
	const _ = SchemaBuilder

	afterEach(() => {
		jest.resetModules()
		jest.resetAllMocks()
		jest.clearAllMocks()
	})

	const printBuilderSchema = (builder) => {
		helper.printJson(builder._schema)
	}

	describe('constructor', () => {
		it('should create an instance with the provided schema without opts', () => {
			const schema = {
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				name: { type: String },
				age: { type: Number },
				dateOfBirth: { type: Date },
			}
			const builder = new _(schema)

			expect(builder._schema.obj).toMatchObject({
				username: {
					index: true,
					required: true,
				},
				email: {
					required: true,
				},
				name: {},
				age: {},
				dateOfBirth: {},
			})
			expect(builder._schema.paths._id).toMatchObject({
				path: '_id',
				instance: 'ObjectID',
			})
			expect(builder._schema.paths.username).toMatchObject({
				enumValues: [],
				regExp: null,
				path: 'username',
				instance: 'String',

				options: {
					required: true,
				},
				_index: true,
				isRequired: true,
				originalRequiredValue: true,
			})
			expect(builder._schema.paths.email).toMatchObject({
				enumValues: [],
				regExp: null,
				path: 'email',
				instance: 'String',
				validators: [
					{
						message: 'Path `{PATH}` is required.',
						type: 'required',
					},
				],

				options: {
					required: true,
				},
				_index: null,
				isRequired: true,
				originalRequiredValue: true,
			})
			expect(builder._schema.paths.name).toMatchObject({
				enumValues: [],
				regExp: null,
				path: 'name',
				instance: 'String',
				_index: null,
			})
			expect(builder._schema.paths.age).toMatchObject({
				path: 'age',
				instance: 'Number',

				_index: null,
			})
			expect(builder._schema.paths.dateOfBirth).toMatchObject({
				path: 'dateOfBirth',
				instance: 'Date',
				_index: null,
			})

			// Provided by opts
			expect(builder._schema.paths.createdAt).toMatchObject({
				path: 'createdAt',
				instance: 'Date',
				_index: null,
			})
			expect(builder._schema.paths.updatedAt).toMatchObject({
				path: 'updatedAt',
				instance: 'Date',
				_index: null,
			})
			expect(builder._schema.$timestamps).toMatchObject({
				createdAt: 'createdAt',
				updatedAt: 'updatedAt',
			})
		})

		it('should create an instance with the provided schema with opts', () => {
			const schema = { username: { type: String, required: true } }
			const builder = new _(schema, { timestamps: false })

			expect(builder._schema.$timestamps).toBeUndefined()
			expect(builder._schema.paths.createdAt).toBeUndefined()
			expect(builder._schema.paths.updatedAt).toBeUndefined()
		})
	})

	describe('#method()', () => {
		it('should add the provided methods as instance methods on the schema', () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			})

			const methods = {
				getMyUsernameById(id) {
					return this.findById(id)
						.select({ username: 1 })
						.exec()
						.then(({ username }) => username)
				},
				loadMyFeed({ from, limit }) {
					return this.find({ username: { $gte: from } })
						.limit(limit)
						.exec()
				},
			}
			builder.methods(methods)

			Object.keys(methods).forEach((key) => {
				expect(builder._schema.methods[key]).toBeInstanceOf(Function)
			})
		})

		it('should calls the correct mongoose.Schema function', () => {
			const methodSpy = jest.spyOn(mongoose.Schema.prototype, 'method')

			const methods = {
				loadMyFeed({ from, limit }) {
					return this.find({ username: { $gte: from } })
						.limit(limit)
						.exec()
				},
				coolBeans() {
					return this.find()
				},
			}

			new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			}).methods(methods)

			expect(methodSpy).toHaveBeenCalledWith(methods)
		})

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
			})

			expect(
				builder.methods({
					loadMyFeed({ from, limit }) {
						return this.find({ username: { $gte: from } })
							.limit(limit)
							.exec()
					},
				}),
			).toEqual(builder)
		})
	})

	describe('#staticMethods()', () => {
		it('should add the provided methods as static methods on the schema', () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			})

			const methods = {
				getMyUsernameById(id) {
					return this.findById(id)
						.select({ username: 1 })
						.exec()
						.then(({ username }) => username)
				},
				loadMyFeed({ from, limit }) {
					return this.find({ username: { $gte: from } })
						.limit(limit)
						.exec()
				},
			}
			builder.staticMethods(methods)

			Object.keys(methods).forEach((key) => {
				expect(builder._schema.statics[key]).toBeInstanceOf(Function)
			})
		})

		it('should calls the correct mongoose.Schema method', () => {
			const staticSpy = jest.spyOn(mongoose.Schema.prototype, 'static')

			const methods = {
				loadMyFeed({ from, limit }) {
					return this.find({ username: { $gte: from } })
						.limit(limit)
						.exec()
				},
				coolBeans() {
					return this.find()
				},
			}

			new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			}).staticMethods(methods)

			expect(staticSpy).toHaveBeenCalledWith(methods)
		})

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
			})

			expect(
				builder.staticMethods({
					loadMyFeed({ from, limit }) {
						return this.find({ username: { $gte: from } })
							.limit(limit)
							.exec()
					},
				}),
			).toEqual(builder)
		})
	})

	describe('#staticFields()', () => {
		it('should add the provided methods as static fields on the schema', () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			})

			const fields = {
				foo: `bar_${Date.now()}`,
				MIN_AGE: 13,
			}

			builder.staticFields(fields)

			Object.keys(fields).entries(([key, value]) => {
				const staticField = builder._schema.statics[key]
				expect(staticField).toBe(value)
				expect(staticField).not.toBeUndefined()
			})
		})

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
			})

			expect(
				builder.staticFields({
					foo: 'bar',
				}),
			).toEqual(builder)
		})
	})

	describe('#index()', () => {
		it('should calls the correct mongoose.Schema function', () => {
			const proxySpy = jest.spyOn(mongoose.Schema.prototype, 'index')
			const indices = { username: 1 }
			const opts = { foo: 'bar' }

			new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			}).index(indices, opts)

			expect(proxySpy).toHaveBeenCalledWith(indices, opts)
		})

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, required: true },
			})

			expect(builder.index({ username: 1 })).toEqual(builder)
		})
	})

	describe('#setOption()', () => {
		it('should calls the correct mongoose.Schema function', () => {
			const proxySpy = jest.spyOn(mongoose.Schema.prototype, 'set')
			const key = 'timestamps'
			const value = true

			new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			}).setOption(key, value)

			expect(proxySpy).toHaveBeenCalledWith(key, value)
		})

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, required: true },
			})

			expect(builder.setOption('timestamps', true)).toEqual(builder)
		})
	})

	describe('#useClass()', () => {
		const myClass = class {
			findOneOfMyOwnById(id) {
				return this.find({ _id: id })
			}
		}

		it('should calls the correct mongoose.Schema function', () => {
			const proxySpy = jest.spyOn(mongoose.Schema.prototype, 'loadClass')

			new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			}).useClass(myClass)

			expect(proxySpy).toHaveBeenCalledWith(myClass)
		})

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, required: true },
			})

			expect(builder.setOption(myClass)).toEqual(builder)
		})
	})

	describe('#plugin()', () => {
		it('should calls the correct mongoose.Schema function', () => {
			const proxySpy = jest.spyOn(mongoose.Schema.prototype, 'plugin')
			const plugin = (schema) => 'cool'
			const opts = { foo: 'bar' }

			new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			}).plugin(plugin, opts)

			expect(proxySpy).toHaveBeenCalledWith(plugin, opts)
		})

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, required: true },
			})

			expect(builder.plugin(() => 1)).toEqual(builder)
		})
	})

	describe('#pre()', () => {
		it('should calls the correct mongoose.Schema function', () => {
			const proxySpy = jest.spyOn(mongoose.Schema.prototype, 'pre')
			const callback = function () {
				return Promise.resolve()
			}
			const operationKey = 'save'

			new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			}).pre(operationKey, callback)

			expect(proxySpy).toHaveBeenCalledWith(operationKey, callback)
		})

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, required: true },
			})

			expect(
				builder.pre('save', function (next) {
					next()
				}),
			).toEqual(builder)
		})
	})

	describe('#post()', () => {
		it('should calls the correct mongoose.Schema function', () => {
			const proxySpy = jest.spyOn(mongoose.Schema.prototype, 'post')
			const callback = function () {
				return Promise.resolve()
			}
			const operationKey = 'remove'

			new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			}).post(operationKey, callback)

			expect(proxySpy).toHaveBeenCalledWith(operationKey, callback)
		})

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, required: true },
			})

			expect(
				builder.post('validate', function (next) {
					next()
				}),
			).toEqual(builder)
		})
	})

	describe('#preDoc()', () => {
		it('should call the #pre() method and return the builder', () => {
			const callback = function () {}
			const operationKey = 'remove'

			const builder = new _({
				username: { type: String, required: true },
			})
			const proxySpy = jest.spyOn(builder, 'pre')

			expect(builder.preDoc(operationKey, callback)).toEqual(builder)
			expect(proxySpy).toHaveBeenCalledWith(operationKey, callback)
		})
	})

	describe('#preQuery()', () => {
		it('should call the #pre() method and return the builder', () => {
			const callback = function () {}
			const operationKey = 'remove'

			const builder = new _({
				username: { type: String, required: true },
			})
			const proxySpy = jest.spyOn(builder, 'pre')

			expect(builder.preQuery(operationKey, callback)).toEqual(builder)
			expect(proxySpy).toHaveBeenCalledWith(operationKey, callback)
		})
	})

	describe('#postDoc()', () => {
		it('should call the #post() method and return the builder', () => {
			const callback = function () {}
			const operationKey = 'remove'

			const builder = new _({
				username: { type: String, required: true },
			})
			const proxySpy = jest.spyOn(builder, 'post')

			expect(builder.postDoc(operationKey, callback)).toEqual(builder)
			expect(proxySpy).toHaveBeenCalledWith(operationKey, callback)
		})
	})

	describe('#postQuery()', () => {
		it('should call the #post() method and return the builder', () => {
			const callback = function () {}
			const operationKey = 'remove'

			const builder = new _({
				username: { type: String, required: true },
			})
			const proxySpy = jest.spyOn(builder, 'post')

			expect(builder.postQuery(operationKey, callback)).toEqual(builder)
			expect(proxySpy).toHaveBeenCalledWith(operationKey, callback)
		})
	})

	describe('#toModel()', () => {
		describe('when only a model name is provided', () => {
			it(`should call the mongoose.model method with the provided name and the builder's schema`, () => {
				const modelSpy = jest.spyOn(mongoose, 'model').mockImplementation(() => ({
					foo: 'bar',
				}))

				const builder = new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				})

				const modelName = `boss_user_${Date.now()}`
				builder.toModel(modelName)

				expect(modelSpy).toHaveBeenCalledWith(modelName, builder._schema)
			})
		})

		describe('when config object is provided with only a model name', () => {
			it(`should call the mongoose.Connection.model method with the provided name and the builder's schema`, () => {
				const modelSpy = jest.spyOn(mongoose, 'model').mockImplementation(() => ({
					foo: 'bar',
				}))
				const builder = new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				})

				const modelName = `boss_user_${Date.now()}`

				builder.toModel({ name: modelName })

				expect(modelSpy).toHaveBeenCalledWith(modelName, builder._schema)
			})
		})

		describe('when config object is provided with a model name and mongoose.connection', () => {
			it(`should call the mongoose.Connection.model method with the provided name and the builder's schema`, () => {
				const builder = new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				})

				const modelName = `boss_user_${Date.now()}`
				const connection = mongoose.createConnection()

				const modelSpy = jest.spyOn(connection, 'model').mockImplementation(() => ({
					foo: 'bar',
				}))

				builder.toModel({ name: modelName, connection })

				expect(modelSpy).toHaveBeenCalledWith(modelName, builder._schema)
			})
		})
	})

	describe('#toModelWithConnection()', () => {
		it(`should call the mongoose.Connection.model method with the provided name and the builder's schema`, () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			})

			const modelName = `boss_user_${Date.now()}`
			const connection = mongoose.createConnection()

			const modelSpy = jest.spyOn(connection, 'model').mockImplementation(() => ({
				foo: 'bar',
			}))

			builder.toModelWithConnection(modelName, connection)

			expect(modelSpy).toHaveBeenCalledWith(modelName, builder._schema)
		})
	})

	describe('#run()', () => {
		it(`should call the provided function with the necessary data`, () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			})

			const myFuncSpy = jest.fn()
			builder.run(myFuncSpy)

			expect(myFuncSpy).toHaveBeenCalledWith({
				schema: builder._schema,
				mongoose: mongooseSelector.mongoose,
				Schema: mongooseSelector.mongoose.Schema,
				ObjectId: mongooseSelector.mongoose.Schema.Types.ObjectId,
				Promise: mongooseSelector.mongoose.Promise,
			})
		})

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
			})

			expect(builder.run(() => {})).toEqual(builder)
		})
	})
})
