const mongooseSelector = require('./mongooseSelector')
const SchemaBuilder = require('./SchemaBuilder')

class Slimgoose {
	constructor() {
		this._connected = false
	}

	get mongoose() {
		return mongooseSelector.mongoose
	}

	get Schema() {
		return this.mongoose.Schema
	}

	get ObjectId() {
		return this.mongoose.Types.ObjectId
	}

	get connected() {
		return this._connected
	}

	schema(schemaOrFunc) {
		mongooseSelector.freeze()
		return new SchemaBuilder(schemaOrFunc)
	}

	useMongoose(mongoose) {
		mongooseSelector.use(mongoose)
		return this
	}

	useMongoosePromise(promise) {
		mongooseSelector.usePromiseClass(promise)
		return this
	}

	connect(url, opts) {
		mongooseSelector.freeze()
		return this.mongoose.connect(url, opts).then(() => {
			this._connected = true

			// When the connection is disconnected
			this.mongoose.connection.on('disconnected', () => {
				this._connected = false
				console.warn('Mongoose default connection disconnected')
			})

			// If the Node process ends, close the Mongoose connection
			process.on('SIGINT', () => {
				this._connected = false
				this.mongoose.connection.close(() => {
					console.warn('Mongoose default connection disconnected through app termination')
				})
			})
		})
	}

	/**
	 * Create a Mongoose connection object.
	 * @param {String?} uri
	 * @param {Object?} opts
	 * @returns {Moongoose.Connection}
	 */
	createConnection(uri, opts) {
		mongooseSelector.freeze()
		if (uri) {
			return this.mongoose.createConnection(uri, { useNewUrlParser: true, ...(opts || {}) })
		}

		return this.mongoose.createConnection()
	}

	/**
	 * Open a connection to a MongoDb server.
	 * @param {String} uri
	 * @param {Object?} opts
	 * @returns {Promise<Moongoose.Connection>}
	 */
	openConnection(uri, opts) {
		mongooseSelector.freeze()
		return this.createConnection(uri, opts)
	}

	/**
	 * Creates a test MongoDb server
	 * 
	 * @returns {{
		uri: String,
		server: 
	 * }}
	 */
	connectTestDb() {
		mongooseSelector.freeze()
		return new TestDatabase()
	}
}

module.exports = new Slimgoose()
