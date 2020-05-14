const uniq = require('./uniq');
module.exports = array => uniq(array.filter((a, i) => array.indexOf(a) !== i));
