module.exports = function (array) {
	return array.filter((a, index) => array.indexOf(a) === index);
};
