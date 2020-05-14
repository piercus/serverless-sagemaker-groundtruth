/**
 * This lambda is used to process your manifest entries and pass them to the template engine
 */
/**
* @param {Object} event - s3 event
* @return {Object} The JSON object from your manifest will be provided as a child of the event object.
*/

exports.handler = function (event, context) { // eslint-disable-line no-unused-vars
	return Promise.resolve({taskInput: {taskObject: event.dataObject['source-ref']}});
};
