/**
 * helper cheatsheet: https://github.com/sapegin/helper-cheat-sheet/blob/master/Readme.md
 */

const { assert } = require('chai')
const mongoose = require('mongoose')
const mongooseSelector = require('../../lib/mongooseSelector')
const SchemaBuilder = require('../../lib/SchemaBuilder')
const helper = require('../helper')()
const { withStubs, expect } = helper

describe('schemaBuilder', () => {
	const _ = SchemaBuilder

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

			assert.deepEqual(builder._schema.obj, schema)
			helper.assertDeepEqualObject(builder._schema.paths._id, true, {
				path: '_id',
				instance: 'ObjectID',
			})

			helper.assertDeepEqualObject(builder._schema.paths.username, true, {
				enumValues: [],
				regExp: null,
				path: 'username',
				instance: 'String',
				_index: true,
				isRequired: true,
				originalRequiredValue: true,
			})
			helper.assertDeepEqualObject(builder._schema.paths.email, true, {
				enumValues: [],
				regExp: null,
				path: 'email',
				instance: 'String',

				_index: null,
				isRequired: true,
				originalRequiredValue: true,
			})
			helper.assertDeepEqualObject(builder._schema.paths.name, true, {
				enumValues: [],
				regExp: null,
				path: 'name',
				instance: 'String',
				_index: null,
			})
			helper.assertDeepEqualObject(builder._schema.paths.age, true, {
				path: 'age',
				instance: 'Number',

				_index: null,
			})
			helper.assertDeepEqualObject(builder._schema.paths.dateOfBirth, true, {
				path: 'dateOfBirth',
				instance: 'Date',
				_index: null,
			})

			// Provided by opts
			helper.assertDeepEqualObject(builder._schema.paths.createdAt, true, {
				path: 'createdAt',
				instance: 'Date',
				_index: null,
			})
			helper.assertDeepEqualObject(builder._schema.paths.updatedAt, true, {
				path: 'updatedAt',
				instance: 'Date',
				_index: null,
			})
			helper.assertDeepEqualObject(builder._schema.$timestamps, true, {
				createdAt: 'createdAt',
				updatedAt: 'updatedAt',
			})
		})

		it('should create an instance with the provided schema with opts', () => {
			const schema = { username: { type: String, required: true } }
			const builder = new _(schema, { timestamps: false })

			assert.isUndefined(builder._schema.$timestamps)
			assert.isUndefined(builder._schema.paths.createdAt)
			assert.isUndefined(builder._schema.paths.updatedAt)
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
				expect(builder._schema.methods[key]).to.be.instanceOf(Function)
			})
		})

		it(
			'should call the correct mongoose.Schema function',
			withStubs(() => {
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

				const builder = new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				}).methods(methods)
				Object.entries(methods).forEach(([key, value]) => {
					expect(builder._schema.methods[key]).to.equal(value)
				})
			}),
		)

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
			})

			assert.deepEqual(
				builder.methods({
					loadMyFeed({ from, limit }) {
						return this.find({ username: { $gte: from } })
							.limit(limit)
							.exec()
					},
				}),
				builder,
			)
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
				expect(builder._schema.statics[key]).to.be.instanceOf(Function)
			})
		})

		it(
			'should calls the correct mongoose.Schema method',
			withStubs(() => {
				const staticSpy = helper.spy(mongoose.Schema.prototype, 'static')

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

				assert.deepEqual(staticSpy.lastCall.args, [methods])
			}),
		)

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
			})

			assert.deepEqual(
				builder.staticMethods({
					loadMyFeed({ from, limit }) {
						return this.find({ username: { $gte: from } })
							.limit(limit)
							.exec()
					},
				}),
				builder,
			)
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
				expect(staticField).to.equal(value)
			})
		})

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
			})

			assert.deepEqual(
				builder.staticFields({
					foo: 'bar',
				}),
				builder,
			)
		})
	})

	describe('#index()', () => {
		it(
			'should calls the correct mongoose.Schema function',
			withStubs(() => {
				const proxySpy = helper.spy(mongoose.Schema.prototype, 'index')
				const indices = { username: 1 }
				const opts = { foo: 'bar' }

				new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				}).index(indices, opts)

				assert.deepEqual(proxySpy.lastCall.args, [indices, opts])
			}),
		)

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, required: true },
			})

			assert.deepEqual(builder.index({ username: 1 }), builder)
		})
	})

	describe('#setOption()', () => {
		it(
			'should calls the correct mongoose.Schema function',
			withStubs(() => {
				const proxySpy = helper.spy(mongoose.Schema.prototype, 'set')
				const key = 'timestamps'
				const value = true

				new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				}).setOption(key, value)

				assert.deepEqual(proxySpy.lastCall.args, [key, value])
			}),
		)

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, required: true },
			})

			assert.equal(builder.setOption('timestamps', true), builder)
		})
	})

	describe('#useClass()', () => {
		const myClass = class {
			findOneOfMyOwnById(id) {
				return this.find({ _id: id })
			}
		}

		it(
			'should calls the correct mongoose.Schema function',
			withStubs(() => {
				const proxySpy = helper.stub(mongoose.Schema.prototype, 'loadClass').callsFake()

				new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				}).useClass(myClass)

				assert.deepEqual(proxySpy.lastCall.args, [myClass])
			}),
		)

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, required: true },
			})

			assert.deepEqual(builder.setOption(myClass), builder)
		})
	})

	describe('#plugin()', () => {
		it(
			'should calls the correct mongoose.Schema function',
			withStubs(() => {
				const proxySpy = helper.spy(mongoose.Schema.prototype, 'plugin')
				const plugin = (schema) => 'cool'
				const opts = { foo: 'bar' }

				new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				}).plugin(plugin, opts)

				assert.deepEqual(proxySpy.lastCall.args, [plugin, opts])
			}),
		)

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, required: true },
			})

			assert.deepEqual(
				builder.plugin(() => 1),
				builder,
			)
		})
	})

	describe('#pre()', () => {
		it(
			'should calls the correct mongoose.Schema function',
			withStubs(() => {
				const proxySpy = helper.spy(mongoose.Schema.prototype, 'pre')
				const callback = function () {
					return Promise.resolve()
				}
				const operationKey = 'save'

				new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				}).pre(operationKey, callback)

				assert.deepEqual(proxySpy.lastCall.args, [operationKey, callback])
			}),
		)

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, required: true },
			})

			assert.deepEqual(
				builder.pre('save', function (next) {
					next()
				}),

				builder,
			)
		})
	})

	describe('#post()', () => {
		it(
			'should calls the correct mongoose.Schema function',
			withStubs(() => {
				const proxySpy = helper.spy(mongoose.Schema.prototype, 'post')
				const callback = function () {
					return Promise.resolve()
				}
				const operationKey = 'remove'

				new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				}).post(operationKey, callback)

				assert.deepEqual(proxySpy.lastCall.args, [operationKey, callback])
			}),
		)

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, required: true },
			})

			assert.deepEqual(
				builder.post('validate', function (next) {
					next()
				}),
				builder,
			)
		})
	})

	describe('#preDoc()', () => {
		it(
			'should call the #pre() method and return the builder',
			withStubs(() => {
				const callback = function () {}
				const operationKey = 'remove'

				const builder = new _({
					username: { type: String, required: true },
				})
				const proxySpy = helper.spy(builder, 'pre')

				assert.deepEqual(builder.preDoc(operationKey, callback), builder)
				assert.deepEqual(proxySpy.lastCall.args, [operationKey, callback])
			}),
		)
	})

	describe('#preQuery()', () => {
		it(
			'should call the #pre() method and return the builder',
			withStubs(() => {
				const callback = function () {}
				const operationKey = 'remove'

				const builder = new _({
					username: { type: String, required: true },
				})
				const proxySpy = helper.spy(builder, 'pre')

				assert.deepEqual(builder.preQuery(operationKey, callback), builder)
				assert.deepEqual(proxySpy.lastCall.args, [operationKey, callback])
			}),
		)
	})

	describe('#postDoc()', () => {
		it(
			'should call the #post() method and return the builder',
			withStubs(() => {
				const callback = function () {}
				const operationKey = 'remove'

				const builder = new _({
					username: { type: String, required: true },
				})
				const proxySpy = helper.spy(builder, 'post')

				assert.deepEqual(builder.postDoc(operationKey, callback), builder)
				assert.deepEqual(proxySpy.lastCall.args, [operationKey, callback])
			}),
		)
	})

	describe('#postQuery()', () => {
		it(
			'should call the #post() method and return the builder',
			withStubs(() => {
				const callback = function () {}
				const operationKey = 'remove'

				const builder = new _({
					username: { type: String, required: true },
				})
				const proxySpy = helper.spy(builder, 'post')

				assert.deepEqual(builder.postQuery(operationKey, callback), builder)
				assert.deepEqual(proxySpy.lastCall.args, [operationKey, callback])
			}),
		)
	})

	describe('#toModel()', () => {
		describe('when only a model name is provided', () => {
			it(`should call the mongoose.model method with the provided name and the builder's schema`, () => {
				const builder = new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				})

				const modelName = `boss_user_${Date.now()}`
				const model = builder.toModel(modelName)

				expect(mongoose.modelNames()).to.contain(modelName)
				expect(model.modelName).to.equal(modelName)
				expect(model.schema).to.equal(builder._schema)

				expect(model).to.be.instanceOf(Function)
				expect(model.init).to.be.instanceOf(Function)
				expect(model.db).to.equal(builder._mongoose.connection)
			})
		})

		describe('when config object is provided with only a model name', () => {
			it(`should return a mongoose.model instance with the provided name and the builder's schema`, () => {
				const builder = new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				})

				const modelName = `the_posts_${Date.now()}`
				const model = builder.toModel({ name: modelName })

				expect(mongoose.modelNames()).to.contain(modelName)
				expect(model.modelName).to.equal(modelName)
				expect(model.schema).to.equal(builder._schema)

				expect(model).to.be.instanceOf(Function)
				expect(model.init).to.be.instanceOf(Function)
				expect(model.db).to.equal(builder._mongoose.connection)
			})
		})

		describe('when config object is provided with a model name and mongoose.connection', () => {
			it(`should call the mongoose.Connection.model method with the provided name and the builder's schema`, () => {
				const builder = new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				})

				const modelName = `boss_user_3${Date.now()}`
				const connection = mongoose.createConnection()

				const model = builder.toModel({ name: modelName, connection })

				expect(connection.modelNames()).to.contain(modelName)
				expect(model.modelName).to.equal(modelName)
				expect(model.schema).to.equal(builder._schema)

				expect(model).to.be.instanceOf(Function)
				expect(model.init).to.be.instanceOf(Function)
				expect(model.db).to.equal(connection)
			})
		})
	})

	describe('#toModelWithConnection()', () => {
		it(
			`should call the builder's #toModel() method with the provided name and connection as the config`,
			withStubs(() => {
				const builder = new _({
					username: { type: String, index: true, required: true },
					email: { type: String, required: true },
					age: { type: Number },
				})

				const modelName = `boss_user_${Date.now()}`
				const connection = mongoose.createConnection()

				const expectedModel = {
					foo: `bar_${Date.now()}`,
				}
				const modelSpy = helper.stub(builder, 'toModel').callsFake(() => expectedModel)

				const model = builder.toModelWithConnection(modelName, connection)

				assert.deepEqual(modelSpy.lastCall.args, [{ name: modelName, connection }])
				expect(model, expectedModel)
			}),
		)
	})

	describe('#run()', () => {
		it(`should call the provided function with the necessary data`, () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			})

			const myFuncSpy = helper.stub()
			builder.run(myFuncSpy)

			assert.deepEqual(myFuncSpy.lastCall.args, [
				{
					schema: builder._schema,
					mongoose: mongooseSelector.mongoose,
					Schema: mongooseSelector.mongoose.Schema,
					ObjectId: mongooseSelector.mongoose.Schema.Types.ObjectId,
					Promise: mongooseSelector.mongoose.Promise,
				},
			])
		})

		it('should return the builder', () => {
			const builder = new _({
				username: { type: String, index: true, required: true },
			})

			assert.deepEqual(
				builder.run(() => {}),
				builder,
			)
		})
	})
})
