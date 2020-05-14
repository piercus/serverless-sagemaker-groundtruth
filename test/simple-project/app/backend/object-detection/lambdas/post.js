/**
 * When the worker has completed the task, Ground Truth will send the results to your Post-annotation Lambda.
 * This Lambda is generally used for Annotation Consolidation.
 */
/**
* @param {Object} event - s3 event
* @return {Object} The JSON object
*/

const requestHandler = require('../../shared/post-request-handler');
const consolidateBoundingBoxes = require('../utils/consolidate-bounding-boxes');

exports.handler = requestHandler({consolidateFn: consolidateBoundingBoxes});
