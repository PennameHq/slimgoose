'use strict'

const Q = require('q')
const chai = require('chai')
const assert = chai.assert
const helper = require('../helper')()

const _ = require('../../utils/promises')

// npm run shared-test PromiseUtils
describe('promiseUtils', () => {
	describe('#isType()', () => {
		it('should return true for objects with a .then function and a .fail function', async () => {
			assert.isTrue(_.isType(Q.resolve()))
			assert.isTrue(
				_.isType({
					then: () => {},
					fail: () => {},
				}),
			)
		})

		it('should return true for objects with a .then function and a .catch function', () => {
			assert.isTrue(
				_.isType({
					then: () => {},
					catch: () => {},
				}),
			)
		})

		it('should return false for objects with only a .then function', () => {
			assert.isFalse(
				_.isType({
					then: () => {},
				}),
			)
		})

		it('should return false for objects with only a .fail function', () => {
			assert.isFalse(
				_.isType({
					fail: () => {},
				}),
			)
		})

		it('should return false for objects with only a .catch function', () => {
			assert.isFalse(
				_.isType({
					catch: () => {},
				}),
			)
		})
	})

	describe('#promise()', () => {
		it('should resolve a callback', async () => {
			let resolved = await _.promise(() => {
				return true
			})
			assert.isTrue(resolved)
		})

		it('should reject a callback', async () => {
			try {
				await _.promise(() => {
					throw new Error('hi')
				})
				helper.expectFail()
			} catch (err) {
				assert.equal(err.message, 'hi')
			}
		})
	})

	describe('#wrap()', () => {
		it('should return a function that returns a promise when called', async () => {
			let wrapped = _.wrap(() => {
				return true
			})
			assert.isTrue(await wrapped())
		})

		it('should return a function that returns a promise that is rejected when error is thrown after it is called', async () => {
			try {
				let wrapped = _.wrap(() => {
					throw new Error('hi')
				})

				await wrapped()
				helper.expectFail()
			} catch (err) {
				assert.equal(err.message, 'hi')
			}
		})
	})

	describe('#wrapFailProof()', () => {
		it('should return a function that returns a promise when called', async () => {
			let wrapped = _.wrapFailProof(() => {
				return true
			})
			assert.isTrue(await wrapped())
		})

		it('should return a function that returns a promise that succeeds even when error is thrown after it is called', async () => {
			let thrownErr
			let wrapped = _.wrapFailProof(() => {
				thrownErr = new Error('Ineffective bomb')
				throw err
			})

			await wrapped()
			assert.equal(thrownErr.message, 'Ineffective bomb')
		})
	})

	describe('#delayedResolution()', () => {
		it('should resolve after the provided millis within a reasonable upper bound', async () => {
			let startedAt = Date.now()
			await _.delayedResolution(1000)
			let endedAt = Date.now()

			let elapsedMillis = endedAt - startedAt
			// the elapsed millis is at least 990
			assert.isTrue(elapsedMillis >= 990, `Expected ${elapsedMillis} to be at least 990`)
			assert.isTrue(elapsedMillis < 1025, `Expected ${elapsedMillis} to be at most 1025`)
		})
	})

	describe('#done()', () => {
		it('should resolve a resolved promise with value', async () => {
			let promise = Q.resolve(2)
			let v = await _.done(promise)
			assert.equal(v, 2)
		})

		it('should resolve a function that returns a promise', async () => {
			let v = await _.done(() => Q.resolve(4))
			assert.equal(v, 4)
		})

		it('should resolve a async function that returns a promise', async () => {
			let v = await _.done(async () => {
				return Q.resolve(4)
			})
			assert.equal(v, 4)
		})

		it('should resolve a function that returns a non-promise value by calling the function', async () => {
			let v = await _.done(() => 3)
			assert.equal(v, 3)
		})

		it('should resolve a non-promise value', async () => {
			let v = await _.done(2)
			assert.equal(v, 2)
		})

		it('should resolve a undefined', async () => {
			let v = await _.done(null)
			assert.equal(v, null)
		})

		it('should resolve a an array of promises / values, some resolved some rejected, with values', async () => {
			let promise = [Q.resolve(2), Q.reject(new Error('howdy')), 3]
			let v = await _.done(promise)
			assert.deepEqual(
				v.map((p) => {
					return { state: p.state, value: p.value }
				}),
				[
					{ state: 'fulfilled', value: 2 },
					{ state: 'rejected', value: undefined },
					{ state: 'fulfilled', value: 3 },
				],
			)
		})

		it('should resolve a rejected promise with no value', async () => {
			let promise = Q.reject(new Error('bye'))
			let v = await _.done(promise)
			assert.isUndefined(v)
		})
	})

	describe('#inSerial()', () => {
		it('should resolve a series of promisable functions one at a time', async () => {
			const urls = ['url1', 'url2', 'url3']
			const funcs = urls.map((url) => () => {
				return Q.resolve(url)
			})

			let v = await _.inSerial(funcs)
			assert.deepEqual(v, ['url1', 'url2', 'url3']) // ensures they counted in order
		})

		it('should resolve when provided empty array', async () => {
			assert.deepEqual(await _.inSerial([]), [])
		})

		it('should resolve a series of promisable functions one at a time, skipping as determined by the provided function', async () => {
			const urls = ['url1', 'url2', 'url3']
			const funcs = urls.map((url) => () => {
				return Q.resolve(url)
			})

			let v = await _.inSerial(funcs, {
				skip: ({ index }) => {
					return index === 1 // skip the second function
				},
			})
			assert.deepEqual(v, ['url1', undefined, 'url3']) // ensures they counted in order
		})

		it(
			'should pass along the provided function data and the previous results to each function',
			helper.withStubs(async () => {
				const now = Date.now()
				const urls = ['url1', 'url2', 'url3', 'url4', 'url5', 'url6']
				const funcs = urls.map((url) =>
					helper.stub().callsFake((config) => {
						// modify the config. it shouldn't be passed to the next func
						if (url === 'url3') config.data.cool3 = now
						// modify the results. it shouldn't mutate the original results
						if (url === 'url5') config.results.splice(2, 0, 'my5')
						return Q.resolve(url + now)
					}),
				)

				const funcData = { foo: `bar${now}` }

				let v = await _.inSerial(funcs, {
					data: funcData,
				})

				assert.deepEqual(funcs[0].lastCall.args, [{ results: [], data: funcData }])
				assert.deepEqual(funcs[1].lastCall.args, [{ results: [`url1${now}`], data: funcData }])
				assert.deepEqual(funcs[2].lastCall.args, [
					{ results: [`url1${now}`, `url2${now}`], data: { cool3: now, ...funcData } },
				])
				assert.deepEqual(funcs[3].lastCall.args, [
					{ results: [`url1${now}`, `url2${now}`, `url3${now}`], data: funcData },
				])
				assert.deepEqual(funcs[4].lastCall.args, [
					{
						results: [`url1${now}`, `url2${now}`, 'my5', `url3${now}`, `url4${now}`],
						data: funcData,
					},
				])
				assert.deepEqual(funcs[5].lastCall.args, [
					{
						results: [`url1${now}`, `url2${now}`, `url3${now}`, `url4${now}`, `url5${now}`],
						data: funcData,
					},
				])
				assert.deepEqual(v, [
					`url1${now}`,
					`url2${now}`,
					`url3${now}`,
					`url4${now}`,
					`url5${now}`,
					`url6${now}`,
				])
			}),
		)

		it('should succeed even if one of the promises fails when "safe" option is true', async () => {
			const v = await _.inSerial(
				[
					() => Q.resolve('Hello'),
					() => Q.reject(new Error('Second failed')),
					() => Q.resolve('world!'),
				],
				{ safe: true },
			)
			assert.deepEqual(v, ['Hello', undefined, 'world!'])
		})

		it('should fail when one of the promises fails', async () => {
			let reachedEnd
			try {
				await _.inSerial([
					() => Q.resolve(),
					() => Q.reject(new Error('Second failed')),
					() => {
						reachedEnd = true
						Q.resolve()
					},
				]).then(() => {
					assert.fail('Should have not resolved when one of the promises failed')
				})
			} catch (err) {
				assert.equal(err.message, 'Second failed')
				assert.isUndefined(reachedEnd)
			}
		})

		it('should fail when provided null', async () => {
			try {
				await _.inSerial(null).then(() => {
					assert.fail('Should have not resolved on non array')
				})
			} catch (err) {
				assert.equal(err.message, 'Requires array of promiseable functions')
			}
		})

		it('should fail when provided undefined', async () => {
			try {
				await _.inSerial(undefined).then(() => {
					assert.fail('Should have not resolved on non array')
				})
			} catch (err) {
				assert.equal(err.message, 'Requires array of promiseable functions')
			}
		})

		it('should fail when provided number', async () => {
			try {
				await _.inSerial(1).then(() => {
					assert.fail('Should have not resolved on non array')
				})
			} catch (err) {
				assert.equal(err.message, 'Requires array of promiseable functions')
			}
		})

		it('should fail when provided string', async () => {
			try {
				await _.inSerial('').then(() => {
					assert.fail('Should have not resolved on non array')
				})
			} catch (err) {
				assert.equal(err.message, 'Requires array of promiseable functions')
			}
		})

		it('should fail when provided object', async () => {
			try {
				await _.inSerial({}).then(() => {
					assert.fail('Should have not resolved on non array')
				})
			} catch (err) {
				assert.equal(err.message, 'Requires array of promiseable functions')
			}
		})

		it('should fail when provided  function', async () => {
			try {
				await _.inSerial(function () {}).then(() => {
					assert.fail('Should have not resolved on non array')
				})
			} catch (err) {
				assert.equal(err.message, 'Requires array of promiseable functions')
			}
		})
	})
})
