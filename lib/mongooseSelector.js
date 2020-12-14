const defaultPromiseClass = require('q')
const defaultMongoose = require('mongoose')
defaultMongoose.Promise = defaultPromiseClass

class MongooseSelection {
	constructor() {
		this._customMongoose = undefined
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
		this._promiseClass = PromiseClass || defaultPromiseClass
		this.mongoose.Promise = this.Promise
		return this
	}
}

module.exports = new MongooseSelection()
