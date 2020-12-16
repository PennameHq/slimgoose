'use strict'

const Q = require('q')
const { clone } = require('ramda')

const isArray = function (objToCheck) {
	return (objToCheck && Object.prototype.toString.call(objToCheck) === '[object Array]') || false
}

//a function for checking if an value is a function
function isFunc(functionToCheck) {
	if (!functionToCheck) return false
	const getType = {}
	const toString = getType.toString.call(functionToCheck)

	return toString === '[object Function]' || toString === '[object AsyncFunction]' || false
}

function isAsyncFunc(functionToCheck) {
	var getType = {}
	return (
		(functionToCheck && getType.toString.call(functionToCheck) === '[object AsyncFunction]') ||
		false
	)
}

function promise(callback) {
	return Q.Promise((resolve) => resolve()).then(() => {
		return callback()
	})
}

function wrap(cb, opt_context) {
	return function () {
		return promise(cb.bind(opt_context, ...arguments))
	}
}

function wrapFailProof(cb, opt_context) {
	return function () {
		return done(promise(cb.bind(opt_context, ...arguments)))
	}
}

function isType(v) {
	return v && isFunc(v.then) && (isFunc(v.fail) || isFunc(v.catch))
}

function done(promise) {
	if (isArray(promise)) {
		promise = Q.allSettled(promise)
	}

	if (isFunc(promise) || isAsyncFunc(promise)) {
		try {
			promise = promise()
		} catch (err) {}
	}

	promise = Q.resolve(promise)

	return promise.fail(() => {
		return Q.resolve()
	})
}

function delayedResolution(millis) {
	return Q.Promise((resolve) => {
		setTimeout(resolve, millis)
	})
}

/*
 * promiseSerial resolves Promises sequentially.
 * @example
 * const urls = ['/url1', '/url2', '/url3']
 * const funcs = urls.map(url => () => $.ajax(url))
 *
 * promiseSerial(funcs)
 *   .then(console.log)
 *   .catch(console.error)
 *
 * @param {Array<Function<Promise>>} funcs
 * @param {{
  	// whether or not to resolve regardless of failure in one of the functions.
		safe: ?Boolean,
		// A callback to check whether to skip a function.
		// Takes an object with form {index: Number}
		skip: ?Function,
 * }} opts
 */
function inSerial(funcs, opts) {
	return promise(() => {
		if (!isArray(funcs)) {
			throw new Error('Requires array of promiseable functions')
		}

		if (!funcs.length) {
			return []
		}

		let checkSkip = opts && opts.skip
		let failProof = opts && !!opts.safe
		let funcData = opts && opts.data

		return funcs.reduce((promise, func, currentIndex) => {
			return promise.then((result) => {
				const shouldSkip = checkSkip && checkSkip({ index: currentIndex })
				if (shouldSkip) {
					return result.concat([undefined])
				}

				if (!isFunc(func)) {
					if (failProof) {
						return result.concat([undefined])
					}

					throw new Error(`Function ${func.name || currentIndex} is not a function`)
				}

				const onFail = (err) => {
					if (failProof) {
						return Q.resolve(result.concat([undefined]))
					}
					throw err
				}

				try {
					let p = func({ results: [...result], data: clone(funcData) })

					if (!isType(p)) {
						p = Q.resolve(p)
					} else if (!p.fail) {
						p = Q(p)
					}

					return p.then(Array.prototype.concat.bind(result)).fail(onFail)
				} catch (err) {
					return onFail(err)
				}
			})
		}, Promise.resolve([]))
	})
}

module.exports = {
	promise,
	done: done,
	inSerial: inSerial,
	isType: isType,
	delayedResolution,
	wrap,
	wrapFailProof,
}
