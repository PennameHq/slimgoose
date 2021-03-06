const defaultPromiseClass = require('q')
const defaultMongoose = require('mongoose')
defaultMongoose.Promise = defaultPromiseClass

class MongooseSelection {
	constructor() {
		this._isFrozen = false
		this._customMongoose = defaultMongoose
		this._promiseClass = defaultPromiseClass
	}

	get mongoose() {
		return this._customMongoose || defaultMongoose
	}

	get Promise() {
		return this._promiseClass || defaultPromiseClass
	}

	/**
	 * Prevent future changes to the mongoose instance.
	 */
	freeze() {
		this._isFrozen = true
	}

	use(mongoose) {
		if (this._isFrozen) {
			throw new Error('Attempted to set a custom mongoose after slimgoose has been initiated.')
		}

		this._customMongoose = mongoose

		this.usePromiseClass()
		return this
	}

	usePromiseClass(PromiseClass) {
		this._promiseClass = PromiseClass || this.Promise
		this.mongoose.Promise = this.Promise
		return this
	}
}

module.exports = new MongooseSelection()
