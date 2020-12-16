const { is } = require('ramda')
const { inSerial } = require('../test/lib/utils/promises')
const mongooseSelector = require('./mongooseSelector')

class SchemaBuilder {
	constructor(schemaOrFactory, opts = {}, _isClone = false) {
		if (_isClone) {
			return
		}

		const executionOpts = this._getExecutionOpts()

		if (opts.timestamps === undefined) {
			// Default to including timestamps on schemas
			opts.timestamps = true
		}

		this._schema = new executionOpts.Schema(schemaOrFactory, opts)

		this._preMethodKeyMap = {}
		this._preStaticMethodKeyMap = {}
		this._addBuiltInPlugins()
	}

	get _mongoose() {
		return mongooseSelector.mongoose
	}

	get _Promise() {
		return mongooseSelector.Promise
	}

	/**
	 * Run a custom synchronous operation with the schema and mongoose provided.
	 * @param {Function} callback
	 */
	run(callback) {
		callback({ ...this._getExecutionOpts(), schema: this._updateSchemaAndGet() })
		return this
	}

	/**
	 * Loads an ES6 class into a schema. Maps setters + getters, static methods,
	 * and instance methods to schema virtuals, statics, and methods.
	 * See https://mongoosejs.com/docs/api.html#schema_Schema-loadClass
	 * @param {Object} CustomClass
	 */
	useClass(CustomClass) {
		this._schema.loadClass(CustomClass)
		return this
	}

	/**
	 * Configure an option on the schema.
	 * See https://mongoosejs.com/docs/guide.html
	 * @param {String} key
	 * @param {*} value
	 */
	setOption(key, value) {
		this._schema.set(key, value)
		return this
	}
	/**
	 * Define an index on the schema.
	 * See https://mongoosejs.com/docs/guide.html#indexes
	 * @param {Object} index
	 * @param {Object?} opts
	 */
	index(index, opts) {
		this._schema.index(index, opts)
		return this
	}

	/**
	 * Add instance methods to documents constructed from Models compiled from this schema.
	 * See https://mongoosejs.com/docs/api.html#schema_Schema-method
	 * @param {Object<String, Function>} fieldsMap
	 */
	methods(methodsMap) {
		this._schema.method(this._decorateMethods(methodsMap))
		return this
	}

	/**
	 * Set a static function on the schema.
	 * See https://mongoosejs.com/docs/api.html#schema_Schema-static
	 * @param {Object<String, Function>} fieldsMap
	 */
	staticMethods(staticMethodsMap) {
		const builder = this

		this._schema.static(this._decorateMethods(staticMethodsMap, 'static'))
		return this
	}

	/**
	 * Set a static field on the schema.
	 * @param {Object<String, any>} fieldsMap
	 */
	staticFields(fieldsMap) {
		Object.entries(fieldsMap).forEach(([key, value]) => {
			this._schema.static[key] = value
		})
		return this
	}

	/**
	 * Register functions to be ran before specific methods.
	 * @param {Object<String, Function>} methodsMap
	 */
	preMethods(methodsMap) {
		Object.entries(methodsMap).forEach(([key, preFunc]) => {
			Array.prototype.push.apply(this._getPreMethodByKey(key), [preFunc])
		})
	}

	/**
	 * Register functions to be ran before specific static methods.
	 * @param {Object<String, Function>} methodsMap
	 */
	preStaticMethods(methodsMap) {
		Object.entries(methodsMap).forEach(([key, preStaticFunc]) => {
			Array.prototype.push.apply(this._getPreMethodByKey(key, 'static'), [preStaticFunc])
		})
	}

	/**
	 * Add a plugin to the schema.
	 * See https://mongoosejs.com/docs/plugins.html
	 * @param {Function} plugin
	 */
	plugin(plugin, opts) {
		this._schema.plugin(plugin, opts)
		return this
	}

	/**
	 * Set a "pre" operation middleware.
	 * See https://mongoosejs.com/docs/middleware.html
	 * @param {String} key
	 * @param {Function} cb
	 */
	pre(operation, cb) {
		this._schema.pre(operation, cb)
		return this
	}

	/**
	 * Set a "post" operation middleware.
	 * See https://mongoosejs.com/docs/middleware.html
	 * @param {String} key
	 * @param {Function} cb
	 */
	post(operation, cb) {
		this._schema.post(operation, cb)
		return this
	}

	/**
	 * Set a "pre" document operation middleware.
	 * See https://mongoosejs.com/docs/middleware.html
	 * @param {String} key
	 * @param {Function} cb
	 */
	preDoc(operation, cb) {
		return this.pre(operation, cb)
	}

	/**
	 * Set a "post" document operation middleware.
	 * See https://mongoosejs.com/docs/middleware.html
	 * @param {String} key
	 * @param {Function} cb
	 */
	postDoc(operation, cb) {
		return this.post(operation, cb)
	}

	/**
	 * Set a "pre" query middleware.
	 * See https://mongoosejs.com/docs/middleware.html
	 * @param {String} key
	 * @param {Function} cb
	 */
	preQuery(operation, cb) {
		return this.pre(operation, cb)
	}

	/**
	 * Set a "post" query middleware.
	 * See https://mongoosejs.com/docs/middleware.html
	 * @param {String} key
	 * @param {Function} cb
	 */
	postQuery(operation, cb) {
		return this.post(operation, cb)
	}

	/**
	 * Create the model from the schema.
	 * See https://mongoosejs.com/docs/models.html
	 * @param {String} name
	 */
	toModel(name) {
		const schema = this._schema
		if (!is(Object, name)) {
			return this._mongoose.model(name, schema)
		}

		const config = name
		const mongooseConnection = config.connection || this._mongoose
		return mongooseConnection.model(config.name, schema)
	}

	/**
	 * Create the model from the schema on a custom mongoose connection object.
	 * See https://mongoosejs.com/docs/models.html
	 * See https://mongoosejs.com/docs/api.html#mongoose_Mongoose-createConnection
	 * @param {String} name
	 */
	toModelWithConnection(name, connection) {
		return this.toModel({ name, connection })
	}

	/**
	 * @returns a cloned value of this builder.
	 */
	clone() {
		const builder = new SchemaBuilder(undefined, undefined, true)
		builder._schema = this._schema.clone()
		builder._preMethodKeyMap = { ...this._preMethodKeyMap }
		builder._preStaticMethodKeyMap = { ...this._preStaticMethodKeyMap }

		return builder
	}

	_updateSchemaAndGet() {
		this._schema = this._schema.clone()
		return this._schema
	}

	_getExecutionOpts() {
		const mongoose = this._mongoose
		const Promise = this._Promise
		const Schema = mongoose.Schema
		const ObjectId = mongoose.Schema.Types.ObjectId

		return { mongoose, Schema, ObjectId, Promise }
	}

	_addBuiltInPlugins() {
		// TODO: Copy the built in functionality that SailsJs provides from database connections
		// Basic things, such as create, updateById, delete, softDelete, etc.
	}

	_decorateMethods(methodsMap, type) {
		const builder = this
		return Object.entries(methodsMap).reduce((map, [key, staticMethod]) => {
			map[key] = function () {
				return builder
					._runPreMethodByKey(key, builder._getPreMethodByKey(key, type), arguments)
					.then((newArgs) => {
						return staticMethod.apply(this, newArgs || arguments)
					})
			}
			return map
		}, {})
	}

	_getPreMethodByKey(key, type) {
		const container = this[type === 'static' ? '_preStaticMethodKeyMap' : '_preMethodKeyMap']
		if (!container[key]) {
			container[key] = []
		}
		return container[key]
	}

	/**
	 * Run the registered pre middlewares for the requested static method
	 * @param {String} key
	 * @param {IArguments} args
	 */
	_runPreMethodByKey(key, funcs, args) {
		return inSerial(funcs, { data: { key, args } }).then((results) => {
			// return the final result as the arguments for the static method.
			// This should be an array
			const newArgs = results[results.length - 1]
			return is(Array, newArgs) || !newArgs ? newArgs : [newArgs]
		})
	}
}

module.exports = SchemaBuilder
