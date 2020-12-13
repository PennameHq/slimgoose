/**
 * Jest cheatsheet: https://github.com/sapegin/jest-cheat-sheet/blob/master/Readme.md
 */

const Q = require('q')
const mongooseSelector = require('../../lib/mongooseSelector')
const mongoose = require('mongoose')
const SchemaBuilder = require('../../lib/SchemaBuilder')
const helper = require('../helper')

describe('schemaBuilder', () => {
	const _ = SchemaBuilder

	beforeEach(() => {
		jest.resetModules()
		jest.resetAllMocks()
	})

	const printBuilderSchema = (builder) => {
		helper.printJson(builder._schema)
	}

	describe('constructor', () => {
		it('should create an instance with the provided schema without opts', () => {
			const schema = {
				username: { type: String, index: true, required: true },
				email: { type: String, required: true },
				name: { type: String },
				age: { type: Number },
				dateOfBirth: { type: Date },
			}
			const builder = new _(schema)

			expect(builder._schema.obj).toMatchObject({
				username: {
					index: true,
					required: true,
				},
				email: {
					required: true,
				},
				name: {},
				age: {},
				dateOfBirth: {},
			})
			expect(builder._schema.paths._id).toMatchObject({
				path: '_id',
				instance: 'ObjectID',
			})
			expect(builder._schema.paths.username).toMatchObject({
				enumValues: [],
				regExp: null,
				path: 'username',
				instance: 'String',

				options: {
					required: true,
				},
				_index: true,
				isRequired: true,
				originalRequiredValue: true,
			})
			expect(builder._schema.paths.email).toMatchObject({
				enumValues: [],
				regExp: null,
				path: 'email',
				instance: 'String',
				validators: [
					{
						message: 'Path `{PATH}` is required.',
						type: 'required',
					},
				],

				options: {
					required: true,
				},
				_index: null,
				isRequired: true,
				originalRequiredValue: true,
			})
			expect(builder._schema.paths.name).toMatchObject({
				enumValues: [],
				regExp: null,
				path: 'name',
				instance: 'String',
				_index: null,
			})
			expect(builder._schema.paths.age).toMatchObject({
				path: 'age',
				instance: 'Number',

				_index: null,
			})
			expect(builder._schema.paths.dateOfBirth).toMatchObject({
				path: 'dateOfBirth',
				instance: 'Date',
				_index: null,
			})

			// Provided by opts
			expect(builder._schema.paths.createdAt).toMatchObject({
				path: 'createdAt',
				instance: 'Date',
				_index: null,
			})
			expect(builder._schema.paths.updatedAt).toMatchObject({
				path: 'updatedAt',
				instance: 'Date',
				_index: null,
			})
			expect(builder._schema.$timestamps).toMatchObject({
				createdAt: 'createdAt',
				updatedAt: 'updatedAt',
			})
		})

		it('should create an instance with the provided schema with opts', () => {
			const schema = { username: { type: String, required: true } }
			const builder = new _(schema, { timestamps: false })

			expect(builder._schema.$timestamps).toBeUndefined()
			expect(builder._schema.paths.createdAt).toBeUndefined()
			expect(builder._schema.paths.updatedAt).toBeUndefined()
		})
	})
})
