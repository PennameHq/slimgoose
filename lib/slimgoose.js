const selectMongoose = require('./selectMongoose')
const { is } = require('ramda')
const SchemaBuilder = require('./SchemaBuilder')

class Slimgoose {
	get mongoose() {
		return selectMongoose.mongoose
	}

	get Schema() {
		return this.mongoose.Schema
	}

	get ObjectId() {
		return this.mongoose.Types.ObjectId
	}

	useMongoose(mongoose) {
		selectMongoose.use(mongoose)
		return this
	}

	useMongoosePromise(mongoose) {
		selectMongoose.usePromiseClass(mongoose)
		return this
	}

	schema(schemaOrFunc) {
		return new SchemaBuilder(schemaOrFunc)
	}
}

module.exports = new Slimgoose()
