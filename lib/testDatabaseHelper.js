const { MongoMemoryServer } = require('mongodb-memory-server')
const mongooseSelector = require('./mongooseSelector')

/**
 * Creates a MongoMemoryServer instance
 * @returns {String} the URI to the mongod server.
 * @returns {Promise<String>}
 */
const createServer = () => {
	return new MongoMemoryServer().getUri()
}

/**
 * Drop the database at the provided connection.
 * @param {Mongoose.Connection} mongooseOrConnection
 * @returns {Promise<Boolean>}
 */
const resetDatabase = (mongooseOrConnection) => {
	const connection = mongooseOrConnection.connection || mongooseOrConnection

	return connection.db.dropDatabase().then((success) => {
		assert.isTrue(success, 'Failed to reset test database!')
		return success
	})
}

/**
 * Drop the database at the provided connection.
 * @param {Mongoose.Connection} mongooseOrConnection
 * @returns {Promise<Boolean>}
 */
const resetDefaultDatabase = () => {
	return resetDatabase(mongooseSelector.mongoose)
}

module.exports = {
	createServer,
	resetDatabase,
	resetDefaultDatabase,
}
