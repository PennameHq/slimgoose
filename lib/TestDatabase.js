const { MongoMemoryServer } = require('mongodb-memory-server')
const selectMongoose = require('./selectMongoose')

class TestDatabase {
	/**
	 * Creates a MongoMemoryServer instance
	 * @returns {String} the URI to the mongod server.
	 */
	createServer() {
		return new MongoMemoryServer().getUri()
	}

	/**
	 * Drop the database at the provided connection.
	 * @param {Mongoose.Connection} mongooseOrConnection
	 */
	resetDatabase(mongooseOrConnection) {
		const connection = mongooseOrConnection.connection || mongooseOrConnection

		return connection.db
			.dropDatabase()
			.then((success) => {
				assert.isTrue(success, 'Failed to reset test database!')
				return success
			})
			.fail((err) => {
				console.log(err.message)
				return
			})
	}
}
