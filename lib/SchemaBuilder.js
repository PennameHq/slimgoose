const { is } = require('ramda')
const mongooseSelector = require('./mongooseSelector')

class SchemaBuilder {
	constructor(schemaOrFactory, opts = {}) {
		const executionOpts = this._getExecutionOpts()

		if (opts.timestamps === undefined) {
			opts.timestamps = true
		}

		opts = { useNewUrlParser: true, ...opts }

		this._schema = is(Function, schemaOrFactory)
			? schemaOrFactory(executionOpts)
			: new executionOpts.Schema(schemaOrFactory, opts)

		this._addBuiltInPlugins()
	}

	get _mongoose() {
		return mongooseSelector.mongoose
	}

	get _statics() {
		return this._schema.statics
	}

	_getExecutionOpts() {
		const mongoose = this._mongoose
		const Schema = mongoose.Schema
		const ObjectId = mongoose.Schema.Types.ObjectId

		return { mongoose, Schema, ObjectId }
	}

	_addBuiltInPlugins() {
		// TODO: Copy the built in functionality that SailsJs provides from database connections
		// Basic things, such as create, updateById, delete, softDelete, etc.
	}

	/**
	 * Run a custom synchronous operation with the schema and mongoose provided.
	 * @param {Function} callback
	 */
	run(callback) {
		callback(this._getExecutionOpts())
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
		this._schema(methodsMap)
		return this
	}

	/**
	 * Set a static field on the schema.
	 * @param {Object<String, any>} fieldsMap
	 */
	staticFields(fieldsMap) {
		this._schema.static(fieldsMap)
		return this
	}

	/**
	 * Set a static function on the schema.
	 * See https://mongoosejs.com/docs/api.html#schema_Schema-static
	 * @param {Object<String, Function>} fieldsMap
	 */
	staticMethods(methodsMap) {
		this._schema.static(methodsMap)
		return this
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
		if (!is(Object, name)) {
			return this._schema.model(name, this._schema)
		}

		const mongooseConnection = config.connection || this._mongoose
		return mongooseConnection.model(config.name, this._schema)
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
}

module.exports = SchemaBuilder
