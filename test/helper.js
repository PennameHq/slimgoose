const printJson = (obj) => {
	console.log(
		JSON.stringify(
			obj,
			(k, v) => {
				if (v === undefined) return null
				return v
			},
			4,
		),
	)
}
module.exports = { printJson }
