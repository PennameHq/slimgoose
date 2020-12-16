/**
 * helper cheatsheet: https://github.com/sapegin/helper-cheat-sheet/blob/master/Readme.md
 */

const { assert } = require('chai')
const mongoose = require('mongoose')
const onChange = require('on-change')
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

	describe('nonimmutable methods', () => {
		const createBuilder = (schema) => new _(schema)

		describe('#method()', () => {
			it('should add the provided methods as instance methods on the schema', () => {
				const builder = createBuilder({
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
				'should set the provided methods as static methods on the schema and ensure they are properly set on the model',
				withStubs(async () => {
					let Uxer
					const methods = {
						getMyFellows() {
							return this.find()
						},
						loadSimilarFeed({ from, limit }) {
							return Uxer.find({ age: this.age, username: { $gte: from } })
								.limit(limit)
								.exec()
						},
					}

					const spiesMap = Object.keys(methods).reduce((map, key) => {
						map[key] = helper.spy(methods, key)
						return map
					}, {})

					Uxer = createBuilder({
						username: { type: String, index: true, required: true },
						email: { type: String, required: true },
						age: { type: Number },
					})
						.methods(methods)
						.toModel('uxer_i')

					const findSpy = helper.spy(Uxer, 'find')

					const now = Date.now()
					const uxerA = new Uxer({ username: 'lwd', email: 'lwd@example.com', age: 24 })

					assert.isFunction(uxerA.getMyFellows)
					// Run one of the functions
					await uxerA.loadSimilarFeed({ from: now, limit: 11 })

					// Ensure the method was called on the object correctly
					assert.isTrue(spiesMap.loadSimilarFeed.calledOnce)
					assert.deepEqual(spiesMap.loadSimilarFeed.lastCall.args, [{ from: now, limit: 11 }])
					assert.equal(spiesMap.loadSimilarFeed.lastCall.thisValue, uxerA)

					// Ensure the proper data was past to the model's find call
					assert.deepEqual(findSpy.lastCall.args, [{ age: uxerA.age, username: { $gte: now } }])
				}),
			)

			it(
				'should run the corresponding pre middlewares when a method is invoked',
				withStubs(async () => {
					let Uxer
					const methods = {
						loadSimilarFeed({ from, limit }) {
							return Uxer.find({ age: this.age, username: { $gte: from } })
								.limit(limit)
								.exec()
						},
						coolBeans() {
							return this.find()
						},
					}

					const loadSimilarFeedSpy = helper.spy(methods, 'loadSimilarFeed')

					const preMethods = {
						loadSimilarFeed({ results, data: { key, args, context, setNewArguments } }) {
							setNewArguments([{ ...args[0], secondMiddlewareCalled: results.length + 'dan' }])
							return Uxer.findOne({ username: args[0].from, age: context.age })
								.exec()
								.then(() => args[0])
						},
						foo() {
							return 'bar'
						},
					}
					const preMethods2 = {
						loadSimilarFeed({ results, data: { key, args, context, setNewArguments } }) {
							return Uxer.findOne({ username: { $ne: args[0].from }, age: context.age - 1 })
								.exec()
								.then((result) => {
									setNewArguments([{ ...args[0], secondMiddlewareCalled: results.length + 'linc' }])
									return result
								})
						},
					}

					const spiesMap = Object.keys(preMethods).reduce((map, key) => {
						map[key] = helper.spy(preMethods, key)
						return map
					}, {})

					const spiesMap2 = Object.keys(preMethods2).reduce((map, key) => {
						map[key] = helper.spy(preMethods2, key)
						return map
					}, {})

					Uxer = createBuilder({
						username: { type: String, index: true, required: true },
						email: { type: String, required: true },
						age: { type: Number },
					})
						.methods(methods)
						.preMethods(preMethods)
						.preMethods(preMethods2)
						.toModel('uxer_s3')

					const now = Date.now()
					const findOneSpy = helper.spy(Uxer, 'findOne')

					// Run the static method
					const rootArgs = { from: now, limit: 11 }
					const uxerA = new Uxer({ username: 'lwd', email: 'lwd@example.com', age: 24 })

					// Run one of the functions
					await uxerA.loadSimilarFeed(rootArgs)

					assert.deepEqual(loadSimilarFeedSpy.lastCall.args, [
						{ ...rootArgs, secondMiddlewareCalled: '1linc' },
					])

					// Ensure the first pre middleware was called on the object correctly
					assert.isTrue(spiesMap.loadSimilarFeed.calledOnce)
					assert.deepEqual(spiesMap.loadSimilarFeed.lastCall.args[0].results, [])
					helper.assertDeepEqualObject(spiesMap.loadSimilarFeed.lastCall.args[0].data, true, {
						key: 'loadSimilarFeed',
						context: uxerA,
					})
					assert.deepEqual(spiesMap.loadSimilarFeed.lastCall.args[0].data.args[0], rootArgs)
					assert.isFunction(spiesMap.loadSimilarFeed.lastCall.args[0].data.setNewArguments)
					assert.notEqual(spiesMap.loadSimilarFeed.lastCall.thisValue, Uxer)

					// Ensure the second pre middleware was called on the object correctly
					assert.isTrue(spiesMap2.loadSimilarFeed.calledOnce)
					assert.deepEqual(spiesMap2.loadSimilarFeed.lastCall.args[0].results, [rootArgs])
					helper.assertDeepEqualObject(spiesMap2.loadSimilarFeed.lastCall.args[0].data, true, {
						key: 'loadSimilarFeed',
						context: uxerA,
					})
					assert.deepEqual(spiesMap2.loadSimilarFeed.lastCall.args[0].data.args[0], rootArgs)
					assert.isFunction(spiesMap.loadSimilarFeed.lastCall.args[0].data.setNewArguments)
					assert.notEqual(spiesMap2.loadSimilarFeed.lastCall.thisValue, Uxer)

					// Ensure the pre middlewares for other static methods were not called
					assert.isFalse(spiesMap.foo.called)

					// Ensure the proper data was past to the model's findOne call
					assert.deepEqual(findOneSpy.getCalls()[0].args, [{ age: 24, username: now }])
					assert.deepEqual(findOneSpy.getCalls()[1].args, [{ age: 23, username: { $ne: now } }])
				}),
			)

			it('should return the builder', () => {
				const builder = createBuilder({
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

			it('should update the schema with a clone', () => {
				const builder = createBuilder({
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
				const builder = createBuilder({
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
				'should set the provided methods as static methods on the schema and ensure they are properly set on the model',
				withStubs(async () => {
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

					const spiesMap = Object.keys(methods).reduce((map, key) => {
						map[key] = helper.spy(methods, key)
						return map
					}, {})

					const model = createBuilder({
						username: { type: String, index: true, required: true },
						email: { type: String, required: true },
						age: { type: Number },
					})
						.staticMethods(methods)
						.toModel('uxer_s')

					const now = Date.now()

					assert.isFunction(model.coolBeans)
					// Run one of the functions
					await model.loadMyFeed({ from: now, limit: 11 })

					// Ensure the method was called on the object correctly
					assert.isTrue(spiesMap.loadMyFeed.calledOnce)
					assert.deepEqual(spiesMap.loadMyFeed.lastCall.args, [{ from: now, limit: 11 }])
					assert.equal(spiesMap.loadMyFeed.lastCall.thisValue, model)
				}),
			)

			it(
				'should run the corresponding pre middlewares when a static method is invoked',
				withStubs(async () => {
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

					const loadMyFeedSpy = helper.spy(methods, 'loadMyFeed')

					const preMethods = {
						loadMyFeed({ data: { results, key, args, context, setNewArguments } }) {
							return context.findOne({ username: args[0].from }).then(() => args[0])
						},
						foo() {
							return 'bar'
						},
					}
					const preMethods2 = {
						loadMyFeed({ data: { results, key, args, context, setNewArguments } }) {
							return context.findOne({ username: { $ne: args[0].from } }).then(() => args)
						},
					}

					const spiesMap = Object.keys(preMethods).reduce((map, key) => {
						map[key] = helper.spy(preMethods, key)
						return map
					}, {})

					const spiesMap2 = Object.keys(preMethods2).reduce((map, key) => {
						map[key] = helper.spy(preMethods2, key)
						return map
					}, {})

					const model = createBuilder({
						username: { type: String, index: true, required: true },
						email: { type: String, required: true },
						age: { type: Number },
					})
						.staticMethods(methods)
						.preStaticMethods(preMethods)
						.preStaticMethods(preMethods2)
						.toModel('uxer_s2')

					const now = Date.now()

					// Run the static method
					const rootArgs = { from: now, limit: 11 }
					await model.loadMyFeed(rootArgs)

					assert.deepEqual(loadMyFeedSpy.lastCall.args, [rootArgs])

					// Ensure the first pre middleware was called on the object correctly
					assert.isTrue(spiesMap.loadMyFeed.calledOnce)
					assert.deepEqual(spiesMap.loadMyFeed.lastCall.args[0].results, [])
					helper.assertDeepEqualObject(spiesMap.loadMyFeed.lastCall.args[0].data, true, {
						key: 'loadMyFeed',
						context: model,
					})
					assert.deepEqual(spiesMap.loadMyFeed.lastCall.args[0].data.args[0], rootArgs)
					assert.isFunction(spiesMap.loadMyFeed.lastCall.args[0].data.setNewArguments)
					assert.notEqual(spiesMap.loadMyFeed.lastCall.thisValue, model)

					// Ensure the second pre middleware was called on the object correctly
					assert.isTrue(spiesMap2.loadMyFeed.calledOnce)
					assert.deepEqual(spiesMap2.loadMyFeed.lastCall.args[0].results, [rootArgs])
					helper.assertDeepEqualObject(spiesMap2.loadMyFeed.lastCall.args[0].data, true, {
						key: 'loadMyFeed',
						context: model,
					})
					assert.deepEqual(spiesMap2.loadMyFeed.lastCall.args[0].data.args[0], rootArgs)
					assert.isFunction(spiesMap2.loadMyFeed.lastCall.args[0].data.setNewArguments)
					assert.notEqual(spiesMap2.loadMyFeed.lastCall.thisValue, model)

					// Ensure the pre middlewares for other static methods were not called
					assert.isFalse(spiesMap.foo.called)
				}),
			)

			it('should return the builder', () => {
				const builder = createBuilder({
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
				const builder = createBuilder({
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
				const builder = createBuilder({
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

					createBuilder({
						username: { type: String, index: true, required: true },
						email: { type: String, required: true },
						age: { type: Number },
					}).index(indices, opts)

					assert.deepEqual(proxySpy.lastCall.args, [indices, opts])
				}),
			)

			it('should return the builder', () => {
				const builder = createBuilder({
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

					createBuilder({
						username: { type: String, index: true, required: true },
						email: { type: String, required: true },
						age: { type: Number },
					}).setOption(key, value)

					assert.deepEqual(proxySpy.lastCall.args, [key, value])
				}),
			)

			it('should return the builder', () => {
				const builder = createBuilder({
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

					createBuilder({
						username: { type: String, index: true, required: true },
						email: { type: String, required: true },
						age: { type: Number },
					}).useClass(myClass)

					assert.deepEqual(proxySpy.lastCall.args, [myClass])
				}),
			)

			it('should return the builder', () => {
				const builder = createBuilder({
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

					createBuilder({
						username: { type: String, index: true, required: true },
						email: { type: String, required: true },
						age: { type: Number },
					}).plugin(plugin, opts)

					assert.deepEqual(proxySpy.lastCall.args, [plugin, opts])
				}),
			)

			it('should return the builder', () => {
				const builder = createBuilder({
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

					createBuilder({
						username: { type: String, index: true, required: true },
						email: { type: String, required: true },
						age: { type: Number },
					}).pre(operationKey, callback)

					assert.deepEqual(proxySpy.lastCall.args, [operationKey, callback])
				}),
			)

			it('should return the builder', () => {
				const builder = createBuilder({
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

					createBuilder({
						username: { type: String, index: true, required: true },
						email: { type: String, required: true },
						age: { type: Number },
					}).post(operationKey, callback)

					assert.deepEqual(proxySpy.lastCall.args, [operationKey, callback])
				}),
			)

			it('should return the builder', () => {
				const builder = createBuilder({
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

					const builder = createBuilder({
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

					const builder = createBuilder({
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

					const builder = createBuilder({
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

					const builder = createBuilder({
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
					const builder = createBuilder({
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
					const builder = createBuilder({
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
					const builder = createBuilder({
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
					const builder = createBuilder({
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
	})

	describe('immutable methods', () => {
		const lazyAssertBuilderSchemaNotMutated = (builder) => {
			const originalSchema = builder._schema
			let changed = false
			builder._schema = onChange(originalSchema, (path, value, p) => {
				changed = !path.startsWith('base.Schema.Types.Number.')
			})

			setTimeout(() => {
				assert.isFalse(changed)
				assert.notDeepEqual(builder._schema, originalSchema)
			}, 0)
			return builder
		}

		const createBuilderToEnsureImmutability = (schema) =>
			lazyAssertBuilderSchemaNotMutated(new _(schema))

		describe('#run()', () => {
			it(`should call the provided function with the necessary data`, () => {
				const builder = createBuilderToEnsureImmutability({
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
				const builder = createBuilderToEnsureImmutability({
					username: { type: String, index: true, required: true },
				})

				assert.deepEqual(
					builder.run(() => {}),
					builder,
				)
			})
		})
	})

	describe('#clone()', () => {
		const createBuilder = (schema) => new _(schema)

		it('should return a cloned version of the builder and its underlying values', () => {
			const builder = createBuilder({
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				age: { type: Number },
			})

			const clonedBuilder = builder.clone()
			assert.isTrue(builder !== clonedBuilder)
			assert.isTrue(builder._schema !== clonedBuilder._schema)
			assert.isTrue(builder._preStaticMethodKeyMap !== clonedBuilder._preStaticMethodKeyMap)
			assert.isTrue(builder._preMethodKeyMap !== clonedBuilder._preMethodKeyMap)
		})
	})
})
