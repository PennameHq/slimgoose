const defaultPromiseClass = require('q')
const defaultMongoose = require('mongoose')
defaultMongoose.Promise = defaultPromiseClass

class MongooseSelection {
	constructor() {
		this._customMongoose = undefined
	}

	/**
	 * Prevent future changes to the mongoose instance.
	 */
	freeze() {
		this._frozen = true
	}

	use(mongoose) {
		if (this._frozen) {
			throw new Error('Attempted to set a custom mongoose after slimgoose has been initiated.')
		}

		this._customMongoose = mongoose

		this.usePromiseClass()
		return this
	}

	usePromiseClass(PromiseClass) {
		this.mongoose.Promise = PromiseClass || defaultPromiseClass
		return this
	}

	get mongoose() {
		return this._customMongoose || defaultMongoose
	}
}

module.exports = new MongooseSelection()
