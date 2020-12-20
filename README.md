# slimgoose

A convenient, slim [Mongoose](https://www.npmjs.com/package/mongoose) interface to [MongoDB](https://www.mongodb.com/) for getting your data layer up and running quickly and cleanly. Leverages a clonable schema builder.

### Still Under Development

This module is still under development, but it's well tested, so feel free to take it for a spin.

# Easy Usage

The following is a simple example of how to initiate your mongoose via slimgoose, connect to your mongodb database, create a mongoose model via slimgoose, and use your model.

### Configure mongoose and connect

```javascript
// index.js
// Setup your mongoose
const slimgoose = require('slimgoose')
const Q = require('q')

slimgoose.use(require('mongoose')) // Optional
slimgoose.usePromiseClass(Q) // Optional

// Connect to your mongodb
slimgoose.connect(mongoDbUri, { mongooseOptionA: 'bar' })
```

### Create mongoose model

```javascript
// models/userModel.js

const slimgoose = require('slimgoose')

// Create a mongoose model from a schema
const User = slimgoose
	.schema({
		name: String,
		email: { type: String, require: true },
		username: { type: String, index: true },
	})
	.staticMethods({
		insertNew(data) {
			return new User(data).save()
		},
		findByUsername(username) {
			return this.find({ username })
		},
		load({ from, limit }) {
			const query = { username: { $gte: from } }
			return this.find(query).limit(limit).exec()
		},
	})
	.toModel('user')

module.exports = User
```

### Use mongoose model

Use your model in an operation file to interface with your mongodb data.

```javascript
// operations/User.js
const User = require('../models/userModel')

module.exports = {
	getUserByUsername(username) {
		return User.findByUsername(username)
	},
}
```

### Still under development

We're still in the process of adding documentation, so please reference the tests for more functionality.

# Roadmap

- Need to add slimPlugin™ support
- Need to add cachegoose support
- Need to add more documentation to the README

# Contribute

Contributions are welcomed. This is how you get started:

- Clone this repository
- Run `npm install`
- Start a new branch
- Make improvements
- Add tests
- Run `npm test`
- Open a pull request
