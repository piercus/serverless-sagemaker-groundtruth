module.exports = {
	pre: require('./app/backend/generic/lambdas/pre.js').handler,
	postObjectDetection: require('./app/backend/object-detection/lambdas/post.js').handler
};
